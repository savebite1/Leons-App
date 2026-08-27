import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_STATE_COOKIE, appOrigin, googleConfig, setTokenCookie } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const expected = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
    if (!code || !state || !expected || state !== expected) {
      return NextResponse.redirect(`${appOrigin(request)}/google-calendar?error=oauth_state`);
    }
    const { clientId, clientSecret } = googleConfig();
    const redirectUri = `${appOrigin(request)}/api/google/callback`;
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok || !data.access_token) {
      return NextResponse.redirect(`${appOrigin(request)}/google-calendar?error=token_exchange`);
    }
    const response = NextResponse.redirect(`${appOrigin(request)}/google-calendar?connected=1`);
    setTokenCookie(response, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + Number(data.expires_in || 3600) * 1000,
      scope: data.scope,
      token_type: data.token_type,
    });
    response.cookies.delete(GOOGLE_STATE_COOKIE);
    return response;
  } catch (error: any) {
    return NextResponse.redirect(`${request.nextUrl.origin}/google-calendar?error=${encodeURIComponent(error?.message || 'callback')}`);
  }
}
