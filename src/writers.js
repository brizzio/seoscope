import fs from 'node:fs/promises';
import path from 'node:path';

export async function writeJson(result, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  const base = safeBase(result.url);
  const jsonPath = path.join(outDir, `${base}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
  return { jsonPath, base };
}

export async function writeMarkdown(result, outDir, base) {
  await fs.mkdir(outDir, { recursive: true });
  const md = toMarkdown(result);
  const mdPath = path.join(outDir, `${base || safeBase(result.url)}.md`);
  await fs.writeFile(mdPath, md, 'utf-8');
  return mdPath;
}

function safeBase(url) {
  return url.replace(/https?:\/\//, '').replace(/\W+/g, '-').replace(/-+$/,'').toLowerCase();
}

function bar(n) {
  const v = Math.max(0, Math.min(100, n || 0));
  const blocks = Math.round(v / 10);
  return '█'.repeat(blocks) + '░'.repeat(10 - blocks) + ` ${v}%`;
}

function fmtMs(v) { return v == null ? 'n/a' : `${Math.round(v)} ms`; }
function fmtKb(v) { return v == null ? 'n/a' : `${Math.round(v/1024)} KB`; }

function toMarkdown(r) {
  const robots = r.seo.robotsTxt || { reachable: false, disallowAll: false };
  const sitemap = r.seo.sitemapXml || { reachable: false };
  const broken = (r.seo.brokenLinksSample || []);

  return `# Auditoria de Site\n\n`
    + `- URL: ${r.url}\n- Data: ${r.fetchedAt}\n\n`
    + `## Pontuações\n`
    + `- Performance: ${bar(r.score.performance)}\n`
    + `- SEO: ${bar(r.score.seo)}\n`
    + `- Acessibilidade: ${bar(r.score.accessibility)}\n`
    + `- Usabilidade: ${bar(r.score.usability)}\n`
    + `- Geral: ${bar(r.score.overall)}\n\n`
    + `## Performance\n`
    + `- TTFB: ${fmtMs(r.perf.ttfb)}\n`
    + `- FCP: ${fmtMs(r.perf.fcp)}\n`
    + `- LCP: ${fmtMs(r.perf.lcp)}\n`
    + `- CLS: ${r.perf.cls == null ? 'n/a' : r.perf.cls.toFixed(3)}\n`
    + `- DOMContentLoaded: ${fmtMs(r.perf.dcl)}\n`
    + `- Load: ${fmtMs(r.perf.load)}\n`
    + `- Requests: ${r.perf.totalRequests}\n`
    + `- Transferência: ${r.perf.totalTransferSize} bytes\n\n`
    + `## SEO\n`
    + `- Title: ${r.seo.hasTitle ? 'ok' : 'ausente'} (${r.seo.titleLength ?? 'n/a'} chars)\n`
    + `- Meta description: ${r.seo.hasMetaDescription ? 'ok' : 'ausente'} (${r.seo.metaDescriptionLength ?? 'n/a'} chars)\n`
    + `- Canonical: ${r.seo.canonicalUrl || 'n/a'}\n`
    + `- H1: ${r.seo.h1Count}\n`
    + `- lang: ${r.seo.langAttr || 'n/a'}\n`
    + `- meta robots: ${r.seo.robotsMeta || 'n/a'}\n`
    + `- meta viewport: ${r.seo.viewportMeta || 'n/a'}\n`
    + `- robots.txt: ${robots.reachable ? 'ok' : 'não encontrado'}${robots.disallowAll ? ' (disallow all)' : ''}\n`
    + `- sitemap.xml: ${sitemap.reachable ? 'ok' : 'não encontrado'}\n`
    + (broken.length ? (`- Links quebrados (amostra):\n` + broken.map(u => `  - ${u}`).join('\n') + '\n\n') : '\n')
    + `## Usabilidade & Navegação\n`
    + `- Nav landmark: ${r.ux.hasNavLandmark ? 'sim' : 'não'}\n`
    + `- Header & Footer: ${r.ux.hasHeaderFooter ? 'sim' : 'não'}\n`
    + `- Skip link: ${r.ux.hasSkipLink ? 'sim' : 'não'}\n`
    + `- Imagens sem alt: ${r.ux.imagesWithoutAlt}\n`
    + `- Links sem texto: ${r.ux.linksWithoutText}\n`
    + `- Elementos focáveis: ${r.ux.focusableCount}\n\n`
    + `## Acessibilidade (axe-core)\n`
    + (r.a11y.violations.length
        ? r.a11y.violations.map(v => `- ${v.id} (${v.impact || 'n/a'}): ${v.description}`).join('\n') + '\n'
        : '- Nenhuma violação encontrada\n')
    + `- Regras incompletas: ${r.a11y.incomplete}\n`;
}

