# Seoscope (Next.js)

Auditor de sites (Performance, SEO, Acessibilidade, UX) rodando como aplica\u00e7\u00e3o Next.js com rota de API serverless para Netlify.

## Requisitos
- Node.js 18+
- Depend\u00eancias instaladas: `npm install`
- Para dev local: instale o navegador do Playwright se ainda n\u00e3o tiver (`npm install --save-dev playwright && npx playwright install chromium`). Em produ\u00e7\u00e3o Netlify o bundle `@sparticuz/chromium` cobre isso automaticamente.

## Scripts
- `npm run dev` \u2013 ambiente de desenvolvimento Next.js
- `npm run build` \u2013 build de produ\u00e7\u00e3o
- `npm start` \u2013 servir o build produzido
- `npm run lint` \u2013 lint do c\u00f3digo

## Uso
- UI: `npm run dev` e acesse `http://localhost:3000`. Informe o dom\u00ednio (ex.: `exemplo.com`), e a p\u00e1gina redireciona para `/results` com a auditoria carregada automaticamente.
- API: `GET/POST /api/audit?url=https://exemplo.com&timeout=30000&maxLinks=25`
  - Corpo (POST): `{ "url": "https://exemplo.com", "timeout": 30000, "maxLinks": 25 }`
  - Resposta: JSON com scores, m\u00e9tricas e viola\u00e7\u00f5es do axe-core.
- Healthcheck: `GET /api/health`

## Netlify
- O plugin `@netlify/plugin-nextjs` j\u00e1 est\u00e1 configurado em `netlify.toml`.
- O bundle do Chromium para serverless \u00e9 provido por `@sparticuz/chromium` + `playwright-core` (rota `/api/audit`). Em ambiente Netlify isso roda como fun\u00e7\u00e3o serverless; em dev local, funciona com o Playwright instalado via `playwright-core`.
- Build padr\u00e3o: `npm run build` (sa\u00edda em `.next`).

## Estrutura
- `app/page.js` \u2013 landing/form
- `app/results/page.js` \u2013 dashboard da auditoria
- `app/api/audit/route.js` \u2013 rota HTTP para executar o Playwright/axe
- `lib/audit.js` \u2013 l\u00f3gica de medi\u00e7\u00e3o e scoring
- `tailwind.config.js` / `app/globals.css` \u2013 estilos
