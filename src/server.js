import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAudit } from './audit.js';

const bodyLimit = process.env.AUDIT_API_BODY_LIMIT || '256kb';
const entryPath = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(entryPath);
const clientDir = path.resolve(moduleDir, '../client');
const clientIndex = path.join(clientDir, 'index.html');
const clientResults = path.join(clientDir, 'results.html');

class ValidationError extends Error {}

function buildOptions(input) {
  const opts = {};
  const timeout = pickNumber(input.timeout);
  const maxLinks = pickNumber(input.maxLinks ?? input['max-links'] ?? input.maxLinksToCheck);

  if (timeout != null) {
    if (timeout <= 0) throw new ValidationError('timeout must be greater than zero');
    opts.timeout = timeout;
  }

  if (maxLinks != null) {
    if (maxLinks <= 0) throw new ValidationError('maxLinks must be greater than zero');
    opts.maxLinksToCheck = maxLinks;
  }

  return opts;
}

function pickNumber(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) throw new ValidationError('Numeric fields must be valid numbers');
  return num;
}

function resolvePayload(req) {
  return req.method === 'GET' ? req.query : (req.body || {});
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

export function createServer() {
  const app = express();
  app.use(express.json({ limit: bodyLimit }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  const handleAudit = async (req, res) => {
    const payload = resolvePayload(req);
    const target = typeof payload.url === 'string' ? payload.url.trim() : '';
    if (!target) throw new ValidationError('url is required');

    const options = buildOptions(payload);
    const result = await runAudit(target, options);
    res.json(result);
  };

  app.get('/audit', asyncHandler(handleAudit));
  app.post('/audit', asyncHandler(handleAudit));

  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir));

    if (fs.existsSync(clientIndex)) {
      app.get('/', (_req, res) => res.sendFile(clientIndex));
    }
    if (fs.existsSync(clientResults)) {
      app.get(['/results', '/results.html'], (_req, res) => res.sendFile(clientResults));
    }
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[audit-api] Unhandled error:', err);
    res.status(500).json({ error: 'Audit failed', message: err?.message || 'unexpected error' });
  });

  return app;
}

function start() {
  const app = createServer();
  const port = normalizePort(process.env.PORT) ?? 3033;
  app.listen(port, () => {
    console.log(`Audit API listening on http://localhost:${port}`);
  });
}

function normalizePort(value) {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

if (process.argv[1] === entryPath) {
  start();
}
