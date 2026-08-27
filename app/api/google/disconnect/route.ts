import { NextResponse } from 'next/server';
import { GOOGLE_TOKEN_COOKIE } from '../_lib';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(GOOGLE_TOKEN_COOKIE);
  return response;
}
