import { NextRequest, NextResponse } from 'next/server';
import { googleFetch, setTokenCookie } from '../_lib';

function eventUrl(calendarId: string) {
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
}

export async function GET(request: NextRequest) {
  try {
    const calendarId = request.nextUrl.searchParams.get('calendarId') || 'primary';
    const timeMin = request.nextUrl.searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = request.nextUrl.searchParams.get('timeMax') || new Date(Date.now() + 30 * 86400000).toISOString();
    const url = new URL(eventUrl(calendarId));
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('maxResults', '100');
    const { response, refreshed } = await googleFetch(request, url.toString());
    if (!response) return NextResponse.json({ ok: false, error: 'Google Calendar ist nicht verbunden.' }, { status: 401 });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ ok: false, error: data?.error?.message || 'Google Calendar Fehler' }, { status: response.status });
    const events = (data.items || []).map((e: any) => ({
      id: e.id,
      title: e.summary || '(Ohne Titel)',
      description: e.description || '',
      start: e.start,
      end: e.end,
      htmlLink: e.htmlLink || null,
      status: e.status,
    }));
    const result = NextResponse.json({ ok: true, events });
    if (refreshed) setTokenCookie(result, refreshed);
    return result;
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Google Calendar Fehler' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const calendarId = String(body.calendarId || 'primary');
    const title = String(body.title || '').trim();
    const date = String(body.date || '');
    const start = String(body.start || '');
    const duration = Math.max(5, Number(body.duration || 60));
    if (!title || !date || !start) return NextResponse.json({ ok: false, error: 'Titel, Datum und Startzeit fehlen.' }, { status: 400 });
    const startDate = new Date(`${date}T${start}:00`);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const payload = {
      summary: title,
      description: body.description ? String(body.description) : 'Erstellt mit Leon OS',
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
    };
    const { response, refreshed } = await googleFetch(request, eventUrl(calendarId), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response) return NextResponse.json({ ok: false, error: 'Google Calendar ist nicht verbunden.' }, { status: 401 });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ ok: false, error: data?.error?.message || 'Termin konnte nicht erstellt werden.' }, { status: response.status });
    const result = NextResponse.json({ ok: true, event: { id: data.id, htmlLink: data.htmlLink || null } });
    if (refreshed) setTokenCookie(result, refreshed);
    return result;
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || 'Google Calendar Fehler' }, { status: 500 });
  }
}
