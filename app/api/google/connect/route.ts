import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { GOOGLE_STATE_COOKIE, appOrigin, googleConfig } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { clientId } = googleConfig();
    const state = crypto.randomBytes(24).toString('base64url');
    const redirectUri = `${appOrigin(request)}/api/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      ].join(' '),
    });
    const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    response.cookies.set(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    return response;
  } catch (error: any) {
    return NextResponse.redirect(`${request.nextUrl.origin}/google-calendar?error=${encodeURIComponent(error?.message || 'Google OAuth Fehler')}`);
  }
}
