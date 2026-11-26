import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, extractClientIp } from '@/server/rateLimit';
import { analyzeRoomPhoto } from '@/server/roomCheck';
import { RoomCheckRequestSchema } from '@/shared/schemas';

export const maxDuration = 15;

const MAX_BODY_BYTES = 220_000;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = extractClientIp(request.headers);
  const limit = checkRateLimit('room-check', ip, 3);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many room photo checks. Please wait a minute.',
        },
      },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Compressed image exceeds 220 KB limit.' } },
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
      { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Compressed image exceeds 220 KB limit.' } },
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

  const parsed = RoomCheckRequestSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_BODY', message: 'Invalid room photo payload.' } },
      { status: 400 },
    );
  }

  const result = await analyzeRoomPhoto(parsed.data);
  return NextResponse.json(result);
}
