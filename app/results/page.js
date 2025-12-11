"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function parseNumber(value) {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeUrl(raw) {
  const value = (raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.includes(".")) return "";
  return `https://${value}`;
}

function fmtMs(value) {
  return value == null ? "n/a" : `${Math.round(value)} ms`;
}

function Pill({ ok, text }) {
  if (typeof ok === "string") return <span>{ok}</span>;
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
        ok
          ? "bg-emerald-400/20 text-emerald-200"
          : "bg-rose-400/20 text-rose-200"
      }`}
    >
      {text || (ok ? "OK" : "Faltando")}
    </span>
  );
}

function DefinitionList({ items }) {
  return (
    <dl className="definition-grid">
      {items.map(([title, value]) => (
        <div key={title}>
          <dt className="text-white/50 text-xs uppercase tracking-[0.3em]">
            {title}
          </dt>
          <dd className="text-white text-lg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Scores({ score }) {
  if (!score) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {Object.entries(score).map(([label, value]) => (
        <div
          key={label}
          className="rounded-3xl bg-white/10 border border-white/10 backdrop-blur-2xl p-6 flex flex-col gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
        >
          <p className="text-sm uppercase tracking-[0.4em] text-white/60">
            {label.toUpperCase()}
          </p>
          <strong className="text-4xl font-semibold">{value ?? "n/a"}</strong>
          <span className="text-white/60 text-sm">pontos</span>
        </div>
      ))}
    </div>
  );
}

export default function ResultsPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState("Preparando auditoria...");
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const rawTargetUrl = params.get("url");
  const targetUrl = useMemo(() => normalizeUrl(rawTargetUrl), [rawTargetUrl]);
  const timeout = useMemo(() => parseNumber(params.get("timeout")), [params]);
  const maxLinks = useMemo(() => parseNumber(params.get("maxLinks")), [params]);

  useEffect(() => {
    if (!targetUrl) {
      setStatus("Nenhum dom\u00ednio fornecido. Volte e inicie uma nova auditoria.");
      return;
    }
    runAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUrl]);

  const runAudit = async () => {
    if (!targetUrl) return;
    setRunning(true);
    setStatus("Executando auditoria... isso pode levar alguns segundos.");
    setResult(null);

    const payload = { url: targetUrl };
    if (timeout) payload.timeout = timeout;
    if (maxLinks) payload.maxLinks = maxLinks;

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || data?.message || "Erro na auditoria");
      setResult(data);
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus(err?.message || "Erro inesperado. Tente novamente.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white selection:bg-primary-500/60">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),transparent_55%)]" />
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-b from-cyan-400/20 to-violet-500/10 blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 lg:py-16 space-y-8">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl shadow-[0_25px_80px_rgba(15,23,42,0.65)]">
          <div>
            <p className="text-sm uppercase tracking-[0.45em] text-white/60">Resultado</p>
            <h1 className="text-3xl lg:text-4xl font-semibold mt-2">
              {result?.url || rawTargetUrl || "Carregando..."}
            </h1>
            <p className="text-white/60 mt-2 text-sm">
              {result?.fetchedAt ? new Date(result.fetchedAt).toLocaleString("pt-BR") : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/20 text-white/80 hover:bg-white/10 transition"
            >
              Nova auditoria
            </Link>
            <button
              onClick={runAudit}
              disabled={running || !targetUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 font-semibold shadow-lg shadow-primary-500/30 hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100"
            >
              Reprocessar
            </button>
          </div>
        </header>

        {status && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl shadow-[0_30px_90px_rgba(15,23,42,0.6)]">
            <p className="text-white/80">{status}</p>
          </div>
        )}

        {result && (
          <section className="min-w-screen space-y-8">
            <Scores score={result.score} />

            <div className="grid gap-6 md:grid-cols-2">
              <article className="glass-card">
                <h2 className="card-title">Resumo</h2>
                <DefinitionList
                  items={[
                    ["Performance", result.summary?.performance],
                    ["SEO", result.summary?.seo],
                    ["Acessibilidade", result.summary?.accessibility],
                    ["Usabilidade", result.summary?.usability],
                  ]}
                />
              </article>
              <article className="glass-card">
                <h2 className="card-title">Performance</h2>
                <DefinitionList
                  items={[
                    ["TTFB", fmtMs(result.perf?.ttfb)],
                    ["FCP", fmtMs(result.perf?.fcp)],
                    ["LCP", fmtMs(result.perf?.lcp)],
                    ["CLS", result.perf?.cls == null ? "n/a" : result.perf.cls.toFixed(3)],
                    ["DOMContentLoaded", fmtMs(result.perf?.dcl)],
                    ["Load", fmtMs(result.perf?.load)],
                    ["Requisições", result.perf?.totalRequests ?? "n/a"],
                    [
                      "Transferência",
                      result.perf?.totalTransferSize ? `${Math.round(result.perf.totalTransferSize / 1024)} KB` : "n/a",
                    ],
                  ]}
                />
              </article>
              <article className="glass-card md:col-span-2">
                <h2 className="card-title">SEO</h2>
                <DefinitionList
                  items={[
                    ["Title", <Pill key="title" ok={result.seo?.hasTitle} />],
                    ["Meta description", <Pill key="meta" ok={result.seo?.hasMetaDescription} />],
                    ["Canonical", result.seo?.canonicalUrl || "n/a"],
                    ["H1", result.seo?.h1Count ?? "n/a"],
                    ["lang", result.seo?.langAttr || "n/a"],
                    ["Viewport", result.seo?.viewportMeta || "n/a"],
                    ["robots.txt", <Pill key="robots" ok={result.seo?.robotsTxt?.reachable} />],
                    ["sitemap.xml", <Pill key="sitemap" ok={result.seo?.sitemapXml?.reachable} />],
                  ]}
                />
                <div className="mt-4">
                  {result.seo?.brokenLinksSample?.length ? (
                    <>
                      <p className="text-sm uppercase tracking-[0.3em] text-white/50 mb-2">Links quebrados</p>
                      <ul className="space-y-2 text-white/80">
                        {result.seo.brokenLinksSample.slice(0, 25).map((u) => (
                          <li key={u} className="text-sm truncate">
                            {u}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/20 text-emerald-200 text-sm">
                      Nenhum link quebrado na amostra
                    </span>
                  )}
                </div>
              </article>
              <article className="glass-card">
                <h2 className="card-title">Usabilidade</h2>
                <DefinitionList
                  items={[
                    ["Navegação", <Pill key="nav" ok={result.ux?.hasNavLandmark} />],
                    ["Header + Footer", <Pill key="hf" ok={result.ux?.hasHeaderFooter} />],
                    ["Skip link", <Pill key="skip" ok={result.ux?.hasSkipLink} />],
                    ["Imagens sem alt", result.ux?.imagesWithoutAlt ?? "n/a"],
                    ["Links sem texto", result.ux?.linksWithoutText ?? "n/a"],
                    ["Elementos focáveis", result.ux?.focusableCount ?? "n/a"],
                  ]}
                />
              </article>
              <article className="glass-card">
                <h2 className="card-title">Acessibilidade (axe)</h2>
                <DefinitionList
                  items={[
                    ["Violações", result.a11y?.violations?.length ?? 0],
                    ["Incompletas", result.a11y?.incomplete ?? 0],
                  ]}
                />
                <div className="mt-4 space-y-3">
                  {result.a11y?.violations?.length ? (
                    result.a11y.violations.slice(0, 8).map((v) => (
                      <div key={v.id} className="p-3 rounded-2xl bg-white/10 border border-white/10">
                        <p className="font-semibold">
                          {v.id}{" "}
                          <span className="text-xs text-white/60">({v.impact || "n/a"})</span>
                        </p>
                        <p className="text-sm text-white/70">{v.description}</p>
                      </div>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/20 text-emerald-200 text-sm">
                      Sem violações reportadas
                    </span>
                  )}
                </div>
              </article>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
