import { NextResponse } from 'next/server';

export function GET(): NextResponse<{ ok: boolean }> {
  return NextResponse.json({ ok: true });
}
