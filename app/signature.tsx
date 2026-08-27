'use client';

import type { AppState, Task } from './types';
import { isoToday } from './engine';

function clamp(n:number,min=0,max=100){return Math.max(min,Math.min(max,n));}

export function CommandCenter({state,move,goOS}:{state:AppState;move:Task|null;goOS:()=>void}){
  const today=isoToday();
  const todayTasks=state.tasks.filter(t=>t.dueDate===today);
  const todayDone=todayTasks.filter(t=>t.status==='done').length;
  const dayPct=todayTasks.length?Math.round((todayDone/todayTasks.length)*100):0;

  const doneTasks=state.tasks.filter(t=>t.status==='done').length;
  const xp=doneTasks*25 + state.workouts.length*20 + state.subjects.reduce((n,s)=>n+s.grades.length*10,0);
  const level=Math.floor(xp/250)+1;
  const levelXp=xp%250;
  const levelPct=Math.round((levelXp/250)*100);

  const upcoming=state.exams
    .map(e=>({...e,days:Math.ceil((new Date(e.date+'T12:00:00').getTime()-new Date(today+'T12:00:00').getTime())/86400000)}))
    .filter(e=>e.days>=0&&e.days<=14)
    .sort((a,b)=>a.days-b.days);
  const risk=upcoming.filter(e=>e.days<=7&&e.progress<60);
  const momentum=clamp(Math.round(dayPct*.55 + levelPct*.25 + Math.min(doneTasks,10)*2));
  const momentumLabel=momentum>=75?'High':momentum>=45?'Building':'Start';

  return <section className="command-center">
    <div className="command-main">
      <div className="command-copy">
        <div className="command-kicker"><span className="live-dot"/> TODAY COMMAND CENTER</div>
        <h2>{move?move.title:'System bereit.'}</h2>
        <p>{move?'Das ist aktuell dein stärkster nächster Schritt.':'Füge Aufgaben oder Prüfungen hinzu und Leon OS baut daraus deinen nächsten Zug.'}</p>
        <div className="command-actions">
          <button className="command-cta" onClick={goOS}><span className="os-orb-mini"/> Ask OS</button>
          <div className="momentum-chip">Momentum <strong>{momentumLabel}</strong></div>
        </div>
      </div>
      <div className="momentum-ring" style={{'--progress':`${momentum*3.6}deg`} as React.CSSProperties}>
        <div className="momentum-inner"><strong>{momentum}</strong><span>MOMENTUM</span></div>
      </div>
    </div>

    <div className="command-metrics">
      <div className="command-metric success-metric">
        <span className="metric-label">DAY COMPLETE</span>
        <strong>{dayPct}%</strong>
        <div className="mini-track"><i style={{width:`${dayPct}%`}}/></div>
        <small>{todayTasks.length?`${todayDone} von ${todayTasks.length} heutigen Tasks`:'Noch keine Tasks für heute'}</small>
      </div>
      <div className="command-metric xp-metric">
        <span className="metric-label">LEVEL {level}</span>
        <strong>{levelXp}<em>/250 XP</em></strong>
        <div className="mini-track"><i style={{width:`${levelPct}%`}}/></div>
        <small>{xp} XP insgesamt</small>
      </div>
      <div className={`command-metric risk-metric ${risk.length?'has-risk':''}`}>
        <span className="metric-label">RISK RADAR</span>
        <strong>{risk.length||'Clear'}</strong>
        <div className="radar-dots">{upcoming.slice(0,5).map(e=><i key={e.id} className={e.days<=7&&e.progress<60?'danger-dot':'safe-dot'} title={`${e.days} Tage · ${e.progress}%`}/>)}</div>
        <small>{risk.length?`${risk.length} Prüfung${risk.length===1?'':'en'} braucht Fokus`:'Keine kritische Prüfung in 7 Tagen'}</small>
      </div>
    </div>
  </section>;
}
