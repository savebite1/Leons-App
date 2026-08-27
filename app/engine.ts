import type { AppState, DayPlanBlock, Subject, Task } from './types';

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
export const isoToday = () => { const d=new Date(); const local=new Date(d.getTime()-d.getTimezoneOffset()*60000); return local.toISOString().slice(0,10); };

export function categoryAverage(subject: Subject, categoryId: string) {
  const grades = subject.grades.filter(g => g.categoryId === categoryId);
  if (!grades.length) return null;
  const weighted = grades.reduce((sum, g) => sum + g.value * g.multiplier, 0);
  const units = grades.reduce((sum, g) => sum + g.multiplier, 0);
  return units ? weighted / units : null;
}

export function subjectScore(subject: Subject) {
  const pieces = subject.categories.map(c => ({ category: c, avg: categoryAverage(subject, c.id) })).filter(x => x.avg !== null);
  if (!pieces.length) return { value: null as number | null, complete: false, contributions: [] as {name:string;avg:number;weight:number}[] };
  const usedWeight = pieces.reduce((sum, p) => sum + p.category.weight, 0);
  if (!usedWeight) return { value: null, complete: false, contributions: [] };
  const value = pieces.reduce((sum, p) => sum + (p.avg as number) * (p.category.weight / usedWeight), 0);
  return {
    value,
    complete: pieces.length === subject.categories.length && Math.abs(subject.categories.reduce((s,c)=>s+c.weight,0)-100) < 0.01,
    contributions: pieces.map(p => ({ name: p.category.name, avg: p.avg as number, weight: p.category.weight }))
  };
}

export function overallAverage(subjects: Subject[]) {
  const scores = subjects.map(subjectScore).filter(s => s.value !== null && s.complete).map(s => s.value as number);
  return scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
}

export function projectedSubjectScore(subject: Subject, categoryId: string, nextGrade: number, multiplier = 1) {
  const clone: Subject = { ...subject, grades: [...subject.grades, { id: 'hypo', categoryId, value: nextGrade, multiplier, date: isoToday(), label: 'Hypothetisch' }] };
  return subjectScore(clone).value;
}

export function solveNextGrade(subject: Subject, target: number, categoryId?: string, multiplier = 1) {
  const cats = categoryId ? subject.categories.filter(c => c.id === categoryId) : subject.categories;
  const results = cats.map(cat => {
    let best: number | null = null;
    for (let g = 6; g >= 0.999; g -= 0.01) {
      const candidate = Number(g.toFixed(2));
      const projected = projectedSubjectScore(subject, cat.id, candidate, multiplier);
      if (projected !== null && projected <= target) { best = candidate; break; }
    }
    return { categoryId: cat.id, category: cat.name, needed: best };
  });
  return results;
}

export function taskPriority(task: Task, state: AppState) {
  if (task.status === 'done') return -999;
  let score = task.importance * 12;
  if (task.dueDate) {
    const days = Math.ceil((new Date(`${task.dueDate}T23:59:59`).getTime() - Date.now()) / 86400000);
    if (days < 0) score += 80;
    else if (days === 0) score += 60;
    else if (days === 1) score += 45;
    else if (days <= 3) score += 30;
    else if (days <= 7) score += 12;
  }
  const subject = state.subjects.find(s => s.id === task.subjectId);
  if (subject) {
    const current = subjectScore(subject).value;
    if (current !== null && current > subject.target) score += Math.min(30, (current - subject.target) * 20);
    const nearExam = state.exams.find(e => e.subjectId === subject.id && (new Date(e.date).getTime() - Date.now()) / 86400000 <= 7 && new Date(e.date).getTime() >= Date.now() - 86400000);
    if (nearExam) score += 18;
  }
  if (task.duration <= 30) score += 4;
  return score;
}

export function nextMove(state: AppState) {
  return state.tasks.filter(t => t.status === 'open').sort((a,b)=>taskPriority(b,state)-taskPriority(a,state))[0] ?? null;
}

export function buildDayPlan(state: AppState, date = isoToday()): DayPlanBlock[] {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const key = String(weekday);
  const home = state.profile.weekdayHomeTimes[key] || '15:00';
  let cursor = toMinutes(home) + 30;
  const fixed = state.events.filter(e => e.date === date).map(e => ({ ...e, startMin: toMinutes(e.start), endMin: toMinutes(e.start)+e.duration })).sort((a,b)=>a.startMin-b.startMin);
  const tasks = state.tasks.filter(t => t.status === 'open').sort((a,b)=>taskPriority(b,state)-taskPriority(a,state)).slice(0,4);
  const blocks: DayPlanBlock[] = [];
  for (const task of tasks) {
    const duration = Math.max(15, Math.min(task.duration || state.profile.focusMinutes, 90));
    cursor = skipFixed(cursor, duration, fixed);
    if (cursor + duration > 21*60) break;
    blocks.push({ id: uid(), title: task.title, start: fromMinutes(cursor), duration, kind: 'task', sourceId: task.id });
    cursor += duration + 15;
  }
  const recentWeek = state.workouts.filter(w => Date.now() - new Date(`${w.date}T12:00:00`).getTime() <= 7*86400000).length;
  if (recentWeek < state.profile.weeklySportTarget) {
    cursor = skipFixed(cursor, 45, fixed);
    if (cursor + 45 <= 21*60) blocks.push({ id: uid(), title: 'Sport', start: fromMinutes(cursor), duration: 45, kind: 'sport' });
  }
  return blocks;
}

function skipFixed(start: number, duration: number, fixed: {startMin:number;endMin:number}[]) {
  let cursor = start;
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of fixed) {
      if (cursor < f.endMin && cursor + duration > f.startMin) {
        cursor = f.endMin + 15;
        changed = true;
      }
    }
  }
  return cursor;
}
function toMinutes(time: string) { const [h,m] = time.split(':').map(Number); return h*60+m; }
function fromMinutes(v: number) { const h=Math.floor(v/60); const m=v%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
