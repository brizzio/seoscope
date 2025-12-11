import { NextResponse } from "next/server";
import { runAudit } from "../../../lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

class ValidationError extends Error {}

function pickNumber(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) throw new ValidationError("Numeric fields must be valid numbers");
  return num;
}

function buildOptions(input) {
  const opts = {};
  const timeout = pickNumber(input.timeout);
  const maxLinks = pickNumber(input.maxLinks ?? input["max-links"] ?? input.maxLinksToCheck);

  if (timeout != null) {
    if (timeout <= 0) throw new ValidationError("timeout must be greater than zero");
    opts.timeout = timeout;
  }

  if (maxLinks != null) {
    if (maxLinks <= 0) throw new ValidationError("maxLinks must be greater than zero");
    opts.maxLinksToCheck = maxLinks;
  }

  return opts;
}

async function resolvePayload(req) {
  if (req.method === "GET") {
    const params = new URL(req.url).searchParams;
    return Object.fromEntries(params.entries());
  }
  try {
    return await req.json();
  } catch {
    throw new ValidationError("Invalid JSON payload");
  }
}

async function handleAudit(req) {
  const payload = await resolvePayload(req);
  const target = typeof payload.url === "string" ? payload.url.trim() : "";
  if (!target) throw new ValidationError("url is required");

  const options = buildOptions(payload);
  return runAudit(target, options);
}

export async function GET(request) {
  try {
    const data = await handleAudit(request);
    return NextResponse.json(data);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request) {
  try {
    const data = await handleAudit(request);
    return NextResponse.json(data);
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err) {
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error("[audit-api] Unhandled error:", err);
  return NextResponse.json({ error: "Audit failed", message: err?.message || "unexpected error" }, { status: 500 });
}
