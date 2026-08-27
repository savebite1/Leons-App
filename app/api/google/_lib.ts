import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const GOOGLE_TOKEN_COOKIE = 'leon_google_tokens';
export const GOOGLE_STATE_COOKIE = 'leon_google_oauth_state';

export type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope?: string;
  token_type?: string;
};

export function appOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google Calendar ist noch nicht konfiguriert.');
  return { clientId, clientSecret };
}

function key() {
  const { clientSecret } = googleConfig();
  return crypto.createHash('sha256').update(clientSecret).digest();
}

export function encryptTokens(tokens: GoogleTokens) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(tokens), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptTokens(raw?: string | null): GoogleTokens | null {
  if (!raw) return null;
  try {
    const buf = Buffer.from(raw, 'base64url');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    return JSON.parse(plain);
  } catch {
    return null;
  }
}

export function setTokenCookie(response: NextResponse, tokens: GoogleTokens) {
  response.cookies.set(GOOGLE_TOKEN_COOKIE, encryptTokens(tokens), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function getValidGoogleTokens(request: NextRequest) {
  const current = decryptTokens(request.cookies.get(GOOGLE_TOKEN_COOKIE)?.value);
  if (!current) return { tokens: null as GoogleTokens | null, refreshed: null as GoogleTokens | null };
  if (current.expires_at > Date.now() + 60_000) return { tokens: current, refreshed: null };
  if (!current.refresh_token) return { tokens: null, refreshed: null };

  const { clientId, clientSecret } = googleConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: current.refresh_token,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) return { tokens: null, refreshed: null };
  const refreshed: GoogleTokens = {
    ...current,
    access_token: data.access_token,
    expires_at: Date.now() + Number(data.expires_in || 3600) * 1000,
    scope: data.scope || current.scope,
    token_type: data.token_type || current.token_type,
  };
  return { tokens: refreshed, refreshed };
}

export async function googleFetch(request: NextRequest, url: string, init?: RequestInit) {
  const { tokens, refreshed } = await getValidGoogleTokens(request);
  if (!tokens) return { response: null as Response | null, refreshed: null as GoogleTokens | null };
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      authorization: `Bearer ${tokens.access_token}`,
    },
    cache: 'no-store',
  });
  return { response, refreshed };
}
