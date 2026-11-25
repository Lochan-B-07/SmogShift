import { NextRequest, NextResponse } from 'next/server';
import { buildBrief } from '@/server/briefTemplates';
import { checkRateLimit, extractClientIp } from '@/server/rateLimit';
import { BriefRequestSchema } from '@/shared/schemas';

const MAX_BODY_BYTES = 4096;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = extractClientIp(request.headers);
  const limit = checkRateLimit('brief', ip, 10);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many brief requests. Please wait a minute.' } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 4 KB limit.' } },
      { status: 413 },
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Unable to read request body.' } },
      { status: 400 },
    );
  }

  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 4 KB limit.' } },
      { status: 413 },
    );
  }

  let jsonBody: unknown;
  try {
    jsonBody = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    );
  }

  const parsed = BriefRequestSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Invalid brief request payload.' } },
      { status: 400 },
    );
  }

  return NextResponse.json(buildBrief(parsed.data));
}
