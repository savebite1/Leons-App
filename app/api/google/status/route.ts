import { NextRequest, NextResponse } from 'next/server';
import { googleFetch, setTokenCookie } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { response, refreshed } = await googleFetch(request, 'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader');
    if (!response) return NextResponse.json({ ok: true, connected: false, calendars: [] });
    if (!response.ok) return NextResponse.json({ ok: false, connected: false, error: 'Google Calendar konnte nicht geladen werden.' }, { status: 502 });
    const data = await response.json();
    const calendars = (data.items || []).map((c: any) => ({
      id: c.id,
      summary: c.summary,
      primary: Boolean(c.primary),
      accessRole: c.accessRole,
      backgroundColor: c.backgroundColor || null,
    }));
    const result = NextResponse.json({ ok: true, connected: true, calendars });
    if (refreshed) setTokenCookie(result, refreshed);
    return result;
  } catch (error: any) {
    const msg = error?.message || 'Google Calendar Fehler';
    const configured = !msg.includes('konfiguriert');
    return NextResponse.json({ ok: false, connected: false, configured, error: msg }, { status: configured ? 500 : 503 });
  }
}
