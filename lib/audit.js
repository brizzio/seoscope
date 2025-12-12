import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import axe from "axe-core";

const require = createRequire(import.meta.url);
const axePath = (() => {
  try {
    return require.resolve("axe-core/axe.min.js");
  } catch {
    try { return require.resolve("axe-core"); } catch { return null; }
  }
})();

export async function runAudit(targetUrl, opts = {}) {
  const options = {
    timeout: 30000,
    waitUntil: "load",
    retries: 2,
    maxLinksToCheck: 25,
    ...opts,
  };

  const browser = await launchBrowser();
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();

  let totalRequests = 0;
  let totalTransferSize = 0;
  page.on("response", async (resp) => {
    try {
      totalRequests += 1;
      const h = resp.headers();
      const len = h["content-length"] || h["Content-Length"];
      const n = len ? parseInt(String(len), 10) : NaN;
      if (!Number.isNaN(n)) totalTransferSize += Math.max(0, n);
    } catch {
      // ignore
    }
  });

  await page.addInitScript(() => {
    try {
      window.__lcp = null;
      window.__cls = 0;

      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) window.__lcp = (last.renderTime || last.loadTime || last.startTime) || window.__lcp;
      }).observe({ type: "largest-contentful-paint", buffered: true });

      let cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!e.hadRecentInput) cls += e.value || 0;
        }
        window.__cls = cls;
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // ignore
    }
  });

  page.setDefaultNavigationTimeout(options.timeout);
  const preferredWait = options.waitUntil || "load";
  const attempts = Math.max(1, Number.isFinite(options.retries) ? options.retries : 2);
  let gotoError = null;
  for (let i = 0; i < attempts; i++) {
    const waitStrategy = i === 0 ? preferredWait : "load";
    try {
      await page.goto(targetUrl, { waitUntil: waitStrategy, timeout: options.timeout });
      gotoError = null;
      break;
    } catch (err) {
      gotoError = err;
    }
  }
  if (gotoError) throw gotoError;

  const tried = [];
  if (axePath) {
    try {
      await page.addScriptTag({ path: axePath });
      tried.push("path");
    } catch (err) {
      tried.push(`path-failed:${err?.message || err}`);
    }
  }
  if (!tried.includes("path")) {
    await page.addScriptTag({ content: axe.source }).catch(() => {});
    tried.push("content");
  }
  const a11y = await page.evaluate(async (axeSource) => {
    let axeRuntime = null;
    try { axeRuntime = window.axe; } catch { axeRuntime = null; }

    if (!axeRuntime || typeof axeRuntime.run !== "function") {
      try {
        // Fallback if addScriptTag failed due to CSP
        const script = document.createElement("script");
        script.textContent = axeSource;
        document.documentElement.appendChild(script);
        axeRuntime = window.axe;
      } catch {
        axeRuntime = null;
      }
    }

    if (!axeRuntime || typeof axeRuntime.run !== "function") {
      try {
        // Last resort: execute source via Function in page context
        // eslint-disable-next-line no-new-func
        const fn = new Function(`${axeSource}; return window.axe;`);
        axeRuntime = fn();
      } catch {
        axeRuntime = null;
      }
    }

    if (!axeRuntime || typeof axeRuntime.run !== "function") {
      throw new Error("axe-core injection failed");
    }

    const res = await axeRuntime.run(document, { resultTypes: ["violations", "incomplete"] });
    return { violations: res.violations, incomplete: res.incomplete.length };
  }, axe.source);

  const { seo, ux } = await page.evaluate(() => {
    const bySel = (sel) => document.querySelector(sel);
    const byAll = (sel) => Array.from(document.querySelectorAll(sel));
    const getAttr = (el, attr) => (el ? el.getAttribute(attr) : null);

    const titleEl = document.querySelector("title");
    const metaDesc = document.querySelector('meta[name="description"]');
    const canonical = document.querySelector('link[rel="canonical"]');
    const h1s = byAll("h1");
    const html = document.documentElement;
    const viewport = document.querySelector('meta[name="viewport"]');
    const robotsMeta = document.querySelector('meta[name="robots"]');

    const hasNavLandmark = !!(bySel("nav") || bySel('[role="navigation"]'));
    const hasHeaderFooter = !!(bySel("header") && bySel("footer"));
    const hasSkipLink = byAll('a[href^="#"]').some((a) => /skip|conteudo|content|main/i.test(a.textContent || ""));
    const imagesWithoutAlt = byAll("img").filter((img) => !(img.hasAttribute("alt") && (img.getAttribute("alt") || "").trim().length)).length;
    const linksWithoutText = byAll("a").filter((a) => !(a.textContent || "").trim() && !a.getAttribute("aria-label")).length;
    const focusableSel = ["a[href]", "button", "input", "select", "textarea", "[tabindex]"].join(",");
    const focusableCount = byAll(focusableSel).length;

    const seo = {
      hasTitle: !!titleEl && !!(titleEl.textContent || "").trim(),
      titleLength: (titleEl && (titleEl.textContent || "").trim().length) || 0,
      hasMetaDescription: !!metaDesc && !!getAttr(metaDesc, "content"),
      metaDescriptionLength: (metaDesc && (getAttr(metaDesc, "content") || "").length) || 0,
      canonicalUrl: (canonical && getAttr(canonical, "href")) || null,
      h1Count: h1s.length,
      hasH1: h1s.length > 0,
      langAttr: html.getAttribute("lang") || null,
      viewportMeta: viewport ? getAttr(viewport, "content") : null,
      robotsMeta: robotsMeta ? getAttr(robotsMeta, "content") : null,
      allLinks: byAll("a[href]").map((a) => new URL(a.getAttribute("href"), location.href).href),
    };

    const ux = { hasNavLandmark, hasHeaderFooter, hasSkipLink, imagesWithoutAlt, linksWithoutText, focusableCount };
    return { seo, ux };
  });

  const origin = new URL(targetUrl).origin;
  const robotsUrl = origin + "/robots.txt";
  const sitemapUrl = origin + "/sitemap.xml";

  let robotsTxt = { reachable: false, disallowAll: false };
  try {
    const robotsRes = await context.request.get(robotsUrl, { timeout: 10000 });
    robotsTxt.reachable = robotsRes.ok();
    if (robotsRes.ok()) {
      const txt = await robotsRes.text();
      robotsTxt.disallowAll = /(^|\n)\s*Disallow:\s*\/(\s|$)/i.test(txt);
    }
  } catch {
    robotsTxt = { reachable: false, disallowAll: false };
  }

  let sitemapXml = { reachable: false };
  try {
    const sitemapRes = await context.request.get(sitemapUrl, { timeout: 10000 });
    sitemapXml.reachable = sitemapRes.ok();
  } catch {
    sitemapXml.reachable = false;
  }

  const uniqueLinks = Array.from(new Set(seo.allLinks)).slice(0, options.maxLinksToCheck);
  const brokenLinksSample = [];
  for (const url of uniqueLinks) {
    try {
      const r = await context.request.get(url, { timeout: 12000, maxRedirects: 3 });
      if (r.status() >= 400) brokenLinksSample.push(url);
    } catch {
      brokenLinksSample.push(url);
    }
  }

  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const fcpEntry = performance.getEntriesByName("first-contentful-paint")[0];
    return {
      ttfb: nav ? nav.responseStart : null,
      fcp: fcpEntry ? fcpEntry.startTime : null,
      lcp: window.__lcp ?? null,
      cls: window.__cls ?? null,
      dcl: nav ? nav.domContentLoadedEventEnd : null,
      load: nav ? nav.loadEventEnd : null,
    };
  });
  perf.totalRequests = totalRequests;
  perf.totalTransferSize = totalTransferSize;

  const perfScore = scorePerformance(perf);
  const seoScore = clamp(
    Math.round(
      [
        seo.hasTitle,
        seo.hasMetaDescription,
        seo.hasH1,
        !!seo.langAttr,
        !!seo.viewportMeta,
        !!seo.canonicalUrl,
        robotsTxt.reachable,
        sitemapXml.reachable,
        brokenLinksSample.length === 0,
      ].reduce((acc, ok) => acc + (ok ? 11.1 : 0), 0),
    ),
  );

  const a11yScore = clamp(100 - Math.min(100, (a11y.violations.length * 7) + (a11y.incomplete * 2)));
  const uxScore = clamp(
    Math.round(
      25 * (ux.hasNavLandmark ? 1 : 0)
      + 20 * (ux.hasHeaderFooter ? 1 : 0)
      + 15 * (ux.hasSkipLink ? 1 : 0)
      + 20 * (ux.imagesWithoutAlt === 0 ? 1 : Math.max(0, 1 - ux.imagesWithoutAlt / 10))
      + 20 * (ux.linksWithoutText === 0 ? 1 : Math.max(0, 1 - ux.linksWithoutText / 10)),
    ),
  );

  const overall = Math.round(0.3 * perfScore + 0.3 * seoScore + 0.25 * a11yScore + 0.15 * uxScore);

  const result = {
    url: targetUrl,
    fetchedAt: new Date().toISOString(),
    perf,
    seo: { ...seo, robotsTxt, sitemapXml, brokenLinksSample },
    a11y,
    ux,
    summary: {
      performance: `LCP ${fmtMs(perf.lcp)}, FCP ${fmtMs(perf.fcp)}, ${toKb(perf.totalTransferSize)} KB, ${perf.totalRequests} reqs`,
      seo: `${seo.hasTitle ? "ok" : "missing"} title, ${seo.hasMetaDescription ? "ok" : "missing"} meta description, ${seo.h1Count} h1, robots:${robotsTxt.reachable ? "ok" : "miss"}`,
      accessibility: `${a11y.violations.length} violations, ${a11y.incomplete} incomplete (axe-core)`,
      usability: `${ux.hasNavLandmark ? "ok" : "miss"} nav, ${ux.hasSkipLink ? "ok" : "miss"} skip, ${ux.imagesWithoutAlt} imgs w/o alt`,
    },
    score: { performance: perfScore, seo: seoScore, accessibility: a11yScore, usability: uxScore, overall },
  };

  await browser.close();
  return result;
}

async function launchBrowser() {
  const isServerless = !!(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);

  // Netlify/Lambda: use @sparticuz/chromium bundled binary (no huge uploads).
  if (isServerless) {
    // Ensure Playwright does not try to resolve its own cache paths (which can break on Netlify)
    process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH
      || "/tmp/ms-playwright";

    const { default: chromium } = await import("@sparticuz/chromium");
    const { chromium: playwrightChromium } = await import("playwright-core");

    const executablePath = await chromium.executablePath();
    if (!executablePath || typeof executablePath !== "string") {
      throw new Error("Sparticuz Chromium executable path is invalid or missing.");
    }
    const headless = typeof chromium.headless === "boolean" ? chromium.headless : true;
    return playwrightChromium.launch({
      args: chromium.args,
      executablePath,
      headless,
      defaultViewport: chromium.defaultViewport,
      ignoreHTTPSErrors: true,
    });
  }

  // Local/dev: use Playwright download if present.
  const { chromium: playwrightChromium } = await import("playwright-core");
  const browserPathRoot = process.env.PLAYWRIGHT_BROWSERS_PATH
    || path.join(process.cwd(), "node_modules/.cache/ms-playwright");
  process.env.PLAYWRIGHT_BROWSERS_PATH = browserPathRoot;

  const executablePath =
    (typeof playwrightChromium.executablePath === "function" && playwrightChromium.executablePath()) ||
    findLocalChromium(browserPathRoot);

  if (!executablePath || typeof executablePath !== "string" || !fs.existsSync(executablePath)) {
    throw new Error("Playwright Chromium not found. Run: npm install && npx playwright install chromium");
  }

  return playwrightChromium.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    executablePath,
  });
}

function findLocalChromium(root) {
  try {
    if (!fs.existsSync(root)) return null;
    const candidates = fs.readdirSync(root).filter((dir) => dir.startsWith("chromium"));
    for (const dir of candidates) {
      const base = path.join(root, dir);
      const linuxShell = path.join(base, "chrome-linux", "chrome");
      const headlessShell = path.join(base, "chrome-headless-shell-linux64", "chrome-headless-shell");
      const winShell = path.join(base, "chrome-win", "chrome.exe");
      if (fs.existsSync(linuxShell)) return linuxShell;
      if (fs.existsSync(headlessShell)) return headlessShell;
      if (fs.existsSync(winShell)) return winShell;
    }
  } catch {
    // ignore
  }
  return null;
}

function clamp(n) {
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}
function toKb(bytes) {
  return bytes ? Math.round(bytes / 1024) : 0;
}
function fmtMs(v) {
  return v == null ? "n/a" : `${Math.round(v)}ms`;
}
function scorePerformance(p) {
  let score = 100;
  if (p.lcp != null) score -= Math.min(50, (p.lcp / 2500) * 35);
  if (p.fcp != null) score -= Math.min(25, (p.fcp / 1800) * 20);
  if (p.ttfb != null) score -= Math.min(10, (p.ttfb / 800) * 10);
  if (p.totalRequests != null) score -= Math.min(15, (p.totalRequests / 120) * 15);
  if (p.totalTransferSize != null) score -= Math.min(20, (p.totalTransferSize / (1024 * 1000)) * 20);
  return clamp(Math.round(score));
}
