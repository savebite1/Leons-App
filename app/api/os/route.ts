import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { buildDayPlan, solveNextGrade, subjectScore } from '../../engine';
import type { AppState, OsAction } from '../../types';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const objectSchema = (properties: Record<string, unknown>, required: string[]) => ({
  type: 'object', properties, required, additionalProperties: false,
});
const nullableString = { type: ['string', 'null'] };
const nullableNumber = { type: ['number', 'null'] };

const tools: any[] = [
  {
    type: 'function', name: 'add_subject', description: 'Create a new school subject in the app.', strict: true,
    parameters: objectSchema({
      name: { type: 'string' }, target: { type: 'number', minimum: 1, maximum: 6 },
      categories: { type: 'array', items: objectSchema({ name: { type: 'string' }, weight: { type: 'number', minimum: 0, maximum: 100 } }, ['name','weight']) }
    }, ['name','target','categories'])
  },
  {
    type: 'function', name: 'update_subject', description: 'Edit an existing school subject, including name, target, category weighting or notes. Category weights must total 100.', strict: true,
    parameters: objectSchema({
      subjectId: { type: 'string' }, name: nullableString, target: nullableNumber,
      categories: { anyOf: [{ type: 'null' }, { type: 'array', items: objectSchema({ name: { type: 'string' }, weight: { type: 'number', minimum: 0, maximum: 100 } }, ['name','weight']) }] },
      notes: nullableString
    }, ['subjectId','name','target','categories','notes'])
  },
  {
    type: 'function', name: 'add_grade', description: 'Add a grade to an existing subject and category.', strict: true,
    parameters: objectSchema({
      subjectId: { type: 'string' }, categoryId: { type: 'string' }, value: { type: 'number', minimum: 1, maximum: 6 },
      multiplier: { type: 'number', enum: [0.5,1,2] }, date: { type: 'string', description: 'YYYY-MM-DD' }, label: { type: 'string' }
    }, ['subjectId','categoryId','value','multiplier','date','label'])
  },
  {
    type: 'function', name: 'add_exam', description: 'Create an exam. Use an existing subjectId.', strict: true,
    parameters: objectSchema({
      subjectId: { type: 'string' }, title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' }, topics: { type: 'string' }, estimatedMinutes: { type: 'number', minimum: 0, maximum: 1000 }
    }, ['subjectId','title','date','topics','estimatedMinutes'])
  },
  {
    type: 'function', name: 'add_task', description: 'Create a task or study task.', strict: true,
    parameters: objectSchema({
      title: { type: 'string' }, subjectId: nullableString, dueDate: nullableString, duration: { type: 'number', minimum: 5, maximum: 480 },
      importance: { type: 'number', minimum: 1, maximum: 5 }, notes: { type: 'string' }
    }, ['title','subjectId','dueDate','duration','importance','notes'])
  },
  {
    type: 'function', name: 'update_task', description: 'Edit or complete an existing task.', strict: true,
    parameters: objectSchema({
      taskId: { type: 'string' }, title: nullableString, dueDate: nullableString, duration: nullableNumber, importance: nullableNumber,
      notes: nullableString, status: { type: ['string','null'], enum: ['open','done',null] }
    }, ['taskId','title','dueDate','duration','importance','notes','status'])
  },
  {
    type: 'function', name: 'add_event', description: 'Add a fixed calendar event.', strict: true,
    parameters: objectSchema({
      title: { type: 'string' }, date: { type: 'string' }, start: { type: 'string', description: 'HH:MM' }, duration: { type: 'number', minimum: 5, maximum: 720 },
      eventType: { type: 'string', enum: ['school','private','study','sport','other'] }
    }, ['title','date','start','duration','eventType'])
  },
  {
    type: 'function', name: 'log_workout', description: 'Log a completed workout.', strict: true,
    parameters: objectSchema({
      workoutType: { type: 'string' }, date: { type: 'string' }, duration: { type: 'number', minimum: 1, maximum: 600 }, distance: nullableNumber, notes: { type: 'string' }
    }, ['workoutType','date','duration','distance','notes'])
  },
  {
    type: 'function', name: 'remember', description: 'Store a durable personal preference or planning fact the user explicitly asks the OS to remember.', strict: true,
    parameters: objectSchema({ text: { type: 'string' } }, ['text'])
  },
  {
    type: 'function', name: 'calculate_target_grade', description: 'Deterministically calculate what next grade could move a subject toward a target. Never estimate grade math yourself when this tool applies.', strict: true,
    parameters: objectSchema({ subjectId: { type: 'string' }, target: { type: 'number', minimum: 1, maximum: 6 }, categoryId: nullableString, multiplier: { type: 'number', enum: [0.5,1,2] } }, ['subjectId','target','categoryId','multiplier'])
  },
  {
    type: 'function', name: 'get_subject_status', description: 'Read the deterministic current calculated grade status for a subject.', strict: true,
    parameters: objectSchema({ subjectId: { type: 'string' } }, ['subjectId'])
  },
  {
    type: 'function', name: 'plan_today', description: 'Generate a deterministic day plan from the user’s real tasks, schedule, priorities and sport target.', strict: true,
    parameters: objectSchema({ date: { type: 'string', description: 'YYYY-MM-DD' } }, ['date'])
  }
];

function compactState(state: AppState) {
  return {
    profile: state.profile,
    subjects: state.subjects.map(s => ({ id:s.id, name:s.name, target:s.target, categories:s.categories, grades:s.grades, notes:s.notes, score:subjectScore(s) })),
    tasks: state.tasks,
    exams: state.exams,
    events: state.events,
    habits: state.habits,
    workouts: state.workouts.slice(-20),
    goals: state.goals,
    memory: state.memory,
    dayPlan: state.dayPlan,
  };
}

function executeTool(name: string, args: any, state: AppState, actions: OsAction[]) {
  switch (name) {
    case 'add_subject': actions.push({ type:'add_subject', payload: args }); return { ok:true, queued:true };
    case 'update_subject': {
      const s = state.subjects.find(x => x.id === args.subjectId);
      if (!s) return { ok:false, error:'Subject not found' };
      if (args.categories && Math.abs(args.categories.reduce((sum:number,c:any)=>sum+c.weight,0)-100) > 0.01) return { ok:false, error:'Category weights must total 100' };
      actions.push({ type:'update_subject', payload: args }); return { ok:true, queued:true };
    }
    case 'add_grade': {
      const s = state.subjects.find(x => x.id === args.subjectId);
      if (!s) return { ok:false, error:'Subject not found' };
      if (!s.categories.some(c => c.id === args.categoryId)) return { ok:false, error:'Category not found' };
      actions.push({ type:'add_grade', payload: args }); return { ok:true, queued:true };
    }
    case 'add_exam': {
      if (!state.subjects.some(x => x.id === args.subjectId)) return { ok:false, error:'Subject not found' };
      actions.push({ type:'add_exam', payload: args }); return { ok:true, queued:true };
    }
    case 'add_task': actions.push({ type:'add_task', payload: args }); return { ok:true, queued:true };
    case 'update_task': {
      if (!state.tasks.some(x => x.id === args.taskId)) return { ok:false, error:'Task not found' };
      actions.push({ type:'update_task', payload: args }); return { ok:true, queued:true };
    }
    case 'add_event': actions.push({ type:'add_event', payload: args }); return { ok:true, queued:true };
    case 'log_workout': actions.push({ type:'log_workout', payload: args }); return { ok:true, queued:true };
    case 'remember': actions.push({ type:'remember', payload: args }); return { ok:true, queued:true };
    case 'calculate_target_grade': {
      const s = state.subjects.find(x => x.id === args.subjectId);
      if (!s) return { ok:false, error:'Subject not found' };
      return { ok:true, current:subjectScore(s), target:args.target, options:solveNextGrade(s,args.target,args.categoryId ?? undefined,args.multiplier) };
    }
    case 'get_subject_status': {
      const s = state.subjects.find(x => x.id === args.subjectId);
      if (!s) return { ok:false, error:'Subject not found' };
      return { ok:true, subject:s.name, target:s.target, score:subjectScore(s) };
    }
    case 'plan_today': {
      const blocks = buildDayPlan(state,args.date);
      actions.push({ type:'set_day_plan', payload:{ blocks } });
      return { ok:true, blocks };
    }
    default: return { ok:false, error:'Unknown tool' };
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ok:false, error:'OPENAI_API_KEY is missing on the server.' }, { status:500 });
    const body = await request.json();
    const message = String(body.message ?? '').trim();
    const state = body.state as AppState;
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    if (!message || !state) return NextResponse.json({ ok:false, error:'Missing message or state.' }, { status:400 });

    const instructions = `You are Leon OS, a personal planning assistant for a teenage student. Speak natural German unless the user switches language. Be concise, calm and useful. You are clearly an AI assistant, not a human.\n\nThe app state is provided below. Never invent subjects, grades, tasks, dates or commitments. If the user asks to change app data, use a function tool. Do not merely claim a change happened. Use IDs exactly as provided. For grade mathematics, use calculate_target_grade or get_subject_status; never do weighted grade math from intuition. For planning, prefer plan_today.\n\nBecause the user is a minor, keep content age-appropriate. Do not encourage unsafe, illegal, sexual, gambling, substance, or self-harm behavior. For high-risk situations, prioritize safety and appropriate adult/professional support.\n\nWhen a request is ambiguous in a way that could create the wrong data, ask one short question instead of guessing. Do not ask for confirmation for ordinary low-risk edits when the request is clear.\n\nCURRENT APP STATE:\n${JSON.stringify(compactState(state))}`;

    const input: any[] = history.map((m:any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content ?? '') }));
    input.push({ role:'user', content:message });
    const actions: OsAction[] = [];

    let response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-terra',
      instructions,
      input,
      tools,
      store: false,
      max_output_tokens: 700,
      reasoning: { effort: 'low' },
    });

    for (let round = 0; round < 4; round++) {
      input.push(...response.output);
      const calls = response.output.filter((item:any) => item.type === 'function_call') as any[];
      if (!calls.length) break;
      for (const call of calls) {
        let args: any = {};
        try { args = JSON.parse(call.arguments || '{}'); } catch { args = {}; }
        const result = executeTool(call.name,args,state,actions);
        input.push({ type:'function_call_output', call_id:call.call_id, output:JSON.stringify(result) });
      }
      response = await openai.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-5.6-terra',
        instructions,
        input,
        tools,
        store: false,
        max_output_tokens: 700,
        reasoning: { effort: 'low' },
      });
    }

    return NextResponse.json({ ok:true, text:response.output_text || 'Erledigt.', actions });
  } catch (error:any) {
    console.error('OS API error', error);
    return NextResponse.json({ ok:false, error:error?.message || 'Unknown AI error' }, { status:500 });
  }
}
