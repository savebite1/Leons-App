# Leon OS

A personal operating system for school, planning, fitness and goals.

## Core principles

- No demo or placeholder user data
- Per-subject grade weighting and deterministic calculations
- Editable subjects, grades, exams, tasks, calendar events, habits, workouts and goals
- Smart day planning based on real tasks, deadlines, events and home times
- Direct OpenAI Responses API integration with controlled function tools
- AI never performs grade math itself; calculations stay in the deterministic engine

## Local development

```bash
npm install
npm run dev
```

Set `OPENAI_API_KEY` in `.env.local` or in Vercel Environment Variables. Optionally set `OPENAI_MODEL`; otherwise the server uses its configured default.

## Deployment

The app is built for Vercel and Next.js 16.
