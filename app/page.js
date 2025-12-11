"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function sanitizeNumber(value) {
  if (!value) return "";
  const num = Number(value);
  return Number.isFinite(num) ? num : "";
}

function normalizeUrl(raw) {
  const value = (raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (!value.includes(".")) return "";
  return `https://${value}`;
}

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const url = (data.get("url") || "").trim();
    if (!url) {
      setStatus("Informe um dom\u00ednio v\u00e1lido.");
      return;
    }

    const params = new URLSearchParams();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setStatus("Formato inv\u00e1lido. Tente algo como exemplo.com");
      return;
    }
    params.set("url", normalized);

    const timeout = sanitizeNumber(data.get("timeout"));
    const maxLinks = sanitizeNumber(data.get("maxLinks"));
    if (timeout) params.set("timeout", timeout);
    if (maxLinks) params.set("maxLinks", maxLinks);

    router.push(`/results?${params.toString()}`);
  };

  return (
    <main className="h-screen bg-slate-950 text-white relative selection:bg-primary-500/60 selection:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),transparent_55%)]" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-b from-fuchsia-500/10 to-cyan-400/5 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center px-4 py-16 gap-12">
        <div className="text-center max-w-6xl space-y-6 p-8">
          <p className="uppercase tracking-[0.4em] text-lg text-white/70">SEOSCOPE</p>
          <h1 className="text-3xl md:text-6xl font-bold leading-tight">
            Veja como as intelig\u00eancias artificiais analisam sites.
          </h1>
          <p className="text-white/70 text-lg">
            Combine Performance, SEO, Acessibilidade e UX em uma \u00fanica an\u00e1lise exatamente como ChatGPT e Gemini
            classificam.
          </p>
        </div>

        <section className="w-full max-w-4xl bg-white/10 border border-white/15 rounded-[40px] shadow-[0_30px_80px_rgba(15,23,42,0.65)] backdrop-blur-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-3">
              <label htmlFor="url" className="text-white/75 font-medium">
                Dom\u00ednio para auditar
              </label>
              <div className="flex flex-col md:flex-row gap-4 md:items-center bg-white/5 rounded-[32px] border border-white/10 px-6 py-4">
                <input
                  id="url"
                  name="url"
                  type="text"
                  required
                  placeholder="exemplo.com"
                  className="flex-1 bg-transparent text-white/90 placeholder:text-white/40 outline-none text-lg"
                />
                <button
                  type="submit"
                  className="whitespace-nowrap bg-gradient-to-r from-primary-500 to-primary-600 font-semibold text-lg px-8 py-3 rounded-full shadow-lg shadow-primary-500/30 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 transition"
                >
                  Auditar agora
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-white/70">
              <label className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                Timeout (ms)
                <input
                  type="number"
                  name="timeout"
                  min="1000"
                  step="500"
                  placeholder="30000"
                  className="w-28 text-white bg-transparent border border-white/15 rounded-lg px-3 py-1 outline-none"
                />
              </label>
              <label className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                M\u00e1x. links
                <input
                  type="number"
                  name="maxLinks"
                  min="1"
                  max="100"
                  placeholder="25"
                  className="w-24 text-white bg-transparent border border-white/15 rounded-lg px-3 py-1 outline-none"
                />
              </label>
            </div>

            <p className="text-sm text-rose-300 h-5">{status}</p>
          </form>

          <div className="mt-10 grid gap-4 md:grid-cols-2 text-white/80">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-white/50">Cobertura</p>
              <h3 className="text-2xl font-semibold mt-2">Performance + SEO + A11y + UX</h3>
              <p className="text-white/70 mt-3">
                M\u00e9tricas detalhadas com Playwright, PerformanceObserver e axe-core para garantir diagn\u00f3sticos
                confi\u00e1veis.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-white/50">Sa\u00edda</p>
              <h3 className="text-2xl font-semibold mt-2">Dashboard instant\u00e2neo</h3>
              <p className="text-white/70 mt-3">
                Resultados exibidos em p\u00e1gina dedicada com scores, estat\u00edsticas e lista de viola\u00e7\u00f5es
                principais.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
