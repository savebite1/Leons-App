'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type CalendarInfo = { id:string; summary:string; primary:boolean; accessRole:string; backgroundColor:string|null };
type GoogleEvent = { id:string; title:string; description:string; start:any; end:any; htmlLink:string|null; status:string };
type LocalEvent = { id:string; title:string; date:string; start:string; duration:number; type:string };

type LocalState = { events?: LocalEvent[] };

const STORAGE_KEY='leon-os-v5';

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

  const from=useMemo(()=>new Date().toISOString(),[]);
  const to=useMemo(()=>new Date(Date.now()+30*86400000).toISOString(),[]);

  useEffect(()=>{
    try{const raw=localStorage.getItem(STORAGE_KEY);const state:LocalState=raw?JSON.parse(raw):{};setLocalEvents(Array.isArray(state.events)?state.events:[]);}catch{}
    loadStatus();
  },[]);

  async function loadStatus(){
    setLoading(true);setError('');
    try{
      const res=await fetch('/api/google/status',{cache:'no-store'});const data=await res.json();
      setConfigured(data.configured!==false);
      setConnected(Boolean(data.connected));
      setCalendars(data.calendars||[]);
      const primary=(data.calendars||[]).find((c:CalendarInfo)=>c.primary);
      if(primary)setCalendarId(primary.id);
      if(!data.ok&&data.error)setError(data.error);
    }catch(e:any){setError(e.message||'Google Calendar konnte nicht geprüft werden.');}
    finally{setLoading(false);}
  }

  async function loadEvents(id=calendarId){
    setError('');
    const q=new URLSearchParams({calendarId:id,timeMin:from,timeMax:to});
    const res=await fetch(`/api/google/events?${q}`,{cache:'no-store'});const data=await res.json();
    if(!data.ok){setError(data.error||'Termine konnten nicht geladen werden.');return;}
    setGoogleEvents(data.events||[]);
  }

  useEffect(()=>{if(connected&&calendarId)loadEvents(calendarId);},[connected,calendarId]);

  async function pushLocal(event:LocalEvent){
    setBusyId(event.id);setError('');
    try{
      const res=await fetch('/api/google/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({calendarId,title:event.title,date:event.date,start:event.start,duration:event.duration,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone})});
      const data=await res.json();if(!data.ok)throw new Error(data.error||'Sync fehlgeschlagen');await loadEvents();
    }catch(e:any){setError(e.message||'Sync fehlgeschlagen');}finally{setBusyId(null);}
  }

  function importGoogle(event:GoogleEvent){
    const startRaw=event.start?.dateTime || event.start?.date;
    if(!startRaw)return;
    const d=new Date(startRaw);
    const date=event.start?.date || localDate(d);
    const start=event.start?.date ? '08:00' : `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const endRaw=event.end?.dateTime || event.end?.date;
    const end=endRaw?new Date(endRaw):new Date(d.getTime()+60*60000);
    const duration=Math.max(5,Math.round((end.getTime()-d.getTime())/60000));
    try{
      const raw=localStorage.getItem(STORAGE_KEY);if(!raw)throw new Error('Leon OS wurde noch nicht eingerichtet.');
      const state=JSON.parse(raw);
      state.events=Array.isArray(state.events)?state.events:[];
      if(state.events.some((e:any)=>e.title===event.title&&e.date===date&&e.start===start))return;
      state.events.push({id:`g-${event.id}`,title:event.title,date,start,duration,type:'other'});
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      setLocalEvents(state.events);
    }catch(e:any){setError(e.message||'Import fehlgeschlagen');}
  }

  async function disconnect(){await fetch('/api/google/disconnect',{method:'POST'});setConnected(false);setCalendars([]);setGoogleEvents([]);}

  return <main className="calendar-page">
    <div className="calendar-shell">
      <div className="calendar-top"><div><div className="eyebrow">INTEGRATION</div><h1>Google Kalender</h1><p>Verbinde Leon OS mit deinem echten Kalender. Keine Demo-Termine.</p></div><Link className="btn" href="/">← Leon OS</Link></div>

      {error&&<div className="warning">{error}</div>}
      <section className="card calendar-connect">
        <div><h2>Verbindung</h2><p className="muted">Google OAuth läuft serverseitig. Dein Refresh-Token wird verschlüsselt in einem HttpOnly-Cookie gespeichert und nicht an den Browser-JavaScript-Code gegeben.</p></div>
        <div>{loading?<span className="pill">Prüfe…</span>:connected?<div className="connect-actions"><span className="pill blue">Verbunden</span><button className="btn" onClick={disconnect}>Trennen</button></div>:configured?<a className="btn primary" href="/api/google/connect">Mit Google verbinden</a>:<span className="pill">Noch nicht konfiguriert</span>}</div>
      </section>

      {connected&&<>
        <section className="card"><div className="split"><div><h2>Kalender</h2><p className="muted">Wähle, welchen Google-Kalender Leon OS verwenden soll.</p></div><select className="select calendar-select" value={calendarId} onChange={e=>setCalendarId(e.target.value)}>{calendars.map(c=><option key={c.id} value={c.id}>{c.summary}{c.primary?' · Primär':''}</option>)}</select></div></section>
        <div className="calendar-grid">
          <section className="card"><div className="split"><div><h2>Google · nächste 30 Tage</h2><p className="muted">Echte Termine aus dem ausgewählten Kalender.</p></div><button className="btn small" onClick={()=>loadEvents()}>Aktualisieren</button></div>{googleEvents.length?<div className="list">{googleEvents.map(e=><div className="row" key={e.id}><div className="rowmain"><div className="rowtitle">{e.title}</div><div className="rowsub">{formatGoogleTime(e)}</div></div><button className="btn small" onClick={()=>importGoogle(e)}>In Leon OS</button></div>)}</div>:<div className="empty">Keine Termine in den nächsten 30 Tagen.</div>}</section>
          <section className="card"><div><h2>Leon OS Termine</h2><p className="muted">Schiebe deine lokalen Leon-OS-Termine in Google Kalender.</p></div>{localEvents.length?<div className="list">{localEvents.slice().sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).map(e=><div className="row" key={e.id}><div className="rowmain"><div className="rowtitle">{e.title}</div><div className="rowsub">{e.date} · {e.start} · {e.duration} min</div></div><button className="btn small primary" disabled={busyId===e.id} onClick={()=>pushLocal(e)}>{busyId===e.id?'Sync…':'Zu Google'}</button></div>)}</div>:<div className="empty">Noch keine Termine in Leon OS.</div>}</section>
        </div>
      </>}

      {!connected&&configured&&<div className="notice">Beim Verbinden fragt Google nur nach Kalender-Ereignissen und der Kalenderliste. Leon OS fordert keinen Gmail- oder Drive-Zugriff an.</div>}
    </div>
  </main>
}

function localDate(d:Date){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}
function formatGoogleTime(e:GoogleEvent){if(e.start?.date)return `${e.start.date} · ganztägig`;if(!e.start?.dateTime)return 'Zeit unbekannt';const d=new Date(e.start.dateTime);return new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d)}
