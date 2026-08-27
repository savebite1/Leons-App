'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type CalendarInfo = { id:string; summary:string; primary:boolean; accessRole:string; backgroundColor:string|null };
type GoogleEvent = { id:string; title:string; description:string; start:any; end:any; htmlLink:string|null; status:string };
type LocalEvent = { id:string; title:string; date:string; start:string; duration:number; type:string };
type LocalState = { events?: LocalEvent[] };

const STORAGE_KEY='leon-os-v5';
const CALENDAR_KEY='leon-google-calendar-id';

export default function GoogleCalendarPage(){
  const [loading,setLoading]=useState(true);
  const [connected,setConnected]=useState(false);
  const [configured,setConfigured]=useState(true);
  const [error,setError]=useState('');
  const [calendars,setCalendars]=useState<CalendarInfo[]>([]);
  const [calendarId,setCalendarId]=useState('primary');
  const [googleEvents,setGoogleEvents]=useState<GoogleEvent[]>([]);
  const [localEvents,setLocalEvents]=useState<LocalEvent[]>([]);
  const [busyId,setBusyId]=useState<string|null>(null);
  const [syncing,setSyncing]=useState(false);
  const [syncMessage,setSyncMessage]=useState('');

  const from=useMemo(()=>new Date().toISOString(),[]);
  const to=useMemo(()=>new Date(Date.now()+30*86400000).toISOString(),[]);

  useEffect(()=>{
    refreshLocal();
    loadStatus();
  },[]);

  function refreshLocal(){
    try{const raw=localStorage.getItem(STORAGE_KEY);const state:LocalState=raw?JSON.parse(raw):{};setLocalEvents(Array.isArray(state.events)?state.events:[]);}catch{}
  }

  async function loadStatus(){
    setLoading(true);setError('');
    try{
      const res=await fetch('/api/google/status',{cache:'no-store'});const data=await res.json();
      setConfigured(data.configured!==false);
      setConnected(Boolean(data.connected));
      setCalendars(data.calendars||[]);
      const saved=localStorage.getItem(CALENDAR_KEY);
      const validSaved=(data.calendars||[]).find((c:CalendarInfo)=>c.id===saved);
      const primary=(data.calendars||[]).find((c:CalendarInfo)=>c.primary);
      setCalendarId(validSaved?.id||primary?.id||data.calendars?.[0]?.id||'primary');
      if(!data.ok&&data.error)setError(data.error);
    }catch(e:any){setError(e.message||'Google Kalender konnte nicht geprüft werden.');}
    finally{setLoading(false);}
  }

  async function loadEvents(id=calendarId){
    setError('');
    const q=new URLSearchParams({calendarId:id,timeMin:from,timeMax:to});
    const res=await fetch(`/api/google/events?${q}`,{cache:'no-store'});const data=await res.json();
    if(!data.ok){setError(data.error||'Termine konnten nicht geladen werden.');return;}
    setGoogleEvents(data.events||[]);
  }

  useEffect(()=>{if(connected&&calendarId){localStorage.setItem(CALENDAR_KEY,calendarId);loadEvents(calendarId);}},[connected,calendarId]);

  function googleToLocal(event:GoogleEvent):LocalEvent|null{
    if(!event.start?.dateTime)return null;
    const d=new Date(event.start.dateTime);
    const endRaw=event.end?.dateTime;
    const end=endRaw?new Date(endRaw):new Date(d.getTime()+60*60000);
    return {
      id:`g-${event.id}`,
      title:event.title,
      date:localDate(d),
      start:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
      duration:Math.max(5,Math.round((end.getTime()-d.getTime())/60000)),
      type:'private'
    };
  }

  function syncFromGoogle(){
    setSyncing(true);setSyncMessage('');setError('');
    try{
      const raw=localStorage.getItem(STORAGE_KEY);if(!raw)throw new Error('Leon OS wurde noch nicht eingerichtet.');
      const state=JSON.parse(raw);
      const mapped=googleEvents.map(googleToLocal).filter(Boolean) as LocalEvent[];
      const old=Array.isArray(state.events)?state.events:[];
      const nonGoogle=old.filter((e:any)=>!String(e.id||'').startsWith('g-'));
      state.events=[...nonGoogle,...mapped];
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      setLocalEvents(state.events);
      setSyncMessage(`${mapped.length} Termine synchronisiert`);
    }catch(e:any){setError(e.message||'Synchronisierung fehlgeschlagen');}
    finally{setSyncing(false);}
  }

  async function pushLocal(event:LocalEvent){
    setBusyId(event.id);setError('');
    try{
      const res=await fetch('/api/google/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({calendarId,title:event.title,date:event.date,start:event.start,duration:event.duration,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone})});
      const data=await res.json();if(!data.ok)throw new Error(data.error||'Sync fehlgeschlagen');await loadEvents();
    }catch(e:any){setError(e.message||'Sync fehlgeschlagen');}finally{setBusyId(null);}
  }

  async function disconnect(){
    await fetch('/api/google/disconnect',{method:'POST'});
    setConnected(false);setCalendars([]);setGoogleEvents([]);setSyncMessage('');
  }

  const upcoming=googleEvents.slice(0,12);
  const manualLocal=localEvents.filter(e=>!String(e.id).startsWith('g-'));

  return <main className="calendar-page">
    <div className="calendar-shell">
      <div className="calendar-top">
        <div><div className="eyebrow">INTEGRATION</div><h1>Google Kalender</h1><p>Der Kalender soll im Hintergrund helfen. Leon OS kann deine echten Termine beim Planen berücksichtigen, ohne dass du hier ständig etwas machen musst.</p></div>
        <Link className="btn" href="/">Zurück zu Leon OS</Link>
      </div>

      {error&&<div className="warning">{error}</div>}

      <section className="card calendar-connect">
        <div>
          <div className="calendar-statusline"><h2 style={{margin:0}}>Google Verbindung</h2>{connected&&<span className="pill blue">Verbunden</span>}</div>
          <p className="muted" style={{marginTop:6}}>{connected?'Dein Kalender ist verbunden und steht dem OS als Planungskontext zur Verfügung.':'Verbinde Google einmal. Danach kann der Kalender im Hintergrund arbeiten.'}</p>
        </div>
        <div>{loading?<span className="pill">Prüfe…</span>:connected?<button className="btn" onClick={()=>loadEvents()}>Aktualisieren</button>:configured?<a className="btn primary" href="/api/google/connect">Mit Google verbinden</a>:<span className="pill">Noch nicht konfiguriert</span>}</div>
      </section>

      {connected&&<>
        <section className="card">
          <div className="split">
            <div><h2 style={{margin:'0 0 6px',fontSize:15}}>Nächste Termine</h2><p className="muted" style={{margin:0}}>Eine ruhige Vorschau. Kein extra Kalender-Dashboard.</p></div>
            <div className="calendar-toolbar"><button className="btn primary" disabled={syncing} onClick={syncFromGoogle}>{syncing?'Synchronisiere…':'Mit Leon OS synchronisieren'}</button></div>
          </div>
          {syncMessage&&<div className="notice" style={{marginTop:14}}>{syncMessage}. Beim nächsten Öffnen von Leon OS sind sie im Plan verfügbar.</div>}
          <div style={{marginTop:12}}>
            {upcoming.length?upcoming.map(e=><div className="calendar-event" key={e.id}><div className="calendar-event-time">{eventTime(e)}</div><div><div className="calendar-event-title">{e.title}</div><div className="rowsub">{eventDate(e)}</div></div></div>):<div className="empty">Keine Termine in den nächsten 30 Tagen.</div>}
          </div>
        </section>

        <details>
          <summary>Kalender-Einstellungen</summary>
          <div className="calendar-advanced">
            <div className="form">
              <div className="field"><span className="label">Verwendeter Google-Kalender</span><select className="select" value={calendarId} onChange={e=>setCalendarId(e.target.value)}>{calendars.map(c=><option key={c.id} value={c.id}>{c.summary}{c.primary?' · Primär':''}</option>)}</select></div>
              <div className="notice">Das OS liest nur Kalenderdaten. Gmail und Drive werden nicht angefordert.</div>
              <button className="btn danger" onClick={disconnect}>Google Kalender trennen</button>
            </div>
          </div>
        </details>

        {manualLocal.length>0&&<details>
          <summary>Leon-OS-Termine nach Google senden</summary>
          <div className="calendar-advanced">
            <div className="list">{manualLocal.slice().sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).map(e=><div className="row" key={e.id}><div className="rowmain"><div className="rowtitle">{e.title}</div><div className="rowsub">{e.date} · {e.start} · {e.duration} min</div></div><button className="btn small" disabled={busyId===e.id} onClick={()=>pushLocal(e)}>{busyId===e.id?'Sync…':'Zu Google'}</button></div>)}</div>
          </div>
        </details>}
      </>}

      {!connected&&configured&&<div className="notice">Nach dem Verbinden verschwindet Google Kalender aus dem Weg und arbeitet hauptsächlich als Kontext für OS und Planung.</div>}
    </div>
  </main>
}

function localDate(d:Date){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}
function eventTime(e:GoogleEvent){if(e.start?.date)return 'Ganztägig';if(!e.start?.dateTime)return '—';const d=new Date(e.start.dateTime);return new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(d)}
function eventDate(e:GoogleEvent){const raw=e.start?.dateTime||e.start?.date;if(!raw)return 'Datum unbekannt';const d=new Date(raw);return new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'2-digit'}).format(d)}
