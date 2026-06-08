# AI Executive Assistant

A production-ready, full-stack "chief of staff" web app: an AI-powered executive assistant that
triages your inbox, manages your calendar, tracks tasks and follow-ups, remembers what matters
about the people you work with, and gives you a daily briefing — all from one dashboard.

Built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn-style UI components, Prisma +
PostgreSQL, and Auth.js (NextAuth). AI features run through a provider-abstraction layer that
supports OpenAI, Anthropic, or a fully deterministic **mock provider** — so the entire app works
out of the box without any API keys.

## Modules

1. **Auth** — email/password (credentials) sign-in, with optional Google OAuth (Gmail + Calendar scopes)
2. **Executive Dashboard** — daily snapshot of priorities, schedule, and AI daily briefing
3. **AI Daily Briefing** — generated summary of what matters today
4. **Email Assistant** — inbox triage, AI summaries, tone-aware reply drafting, convert to task/follow-up
5. **Calendar Assistant** — schedule view, conflict detection, AI meeting prep, reschedule drafting, time suggestions
6. **Task Management** — priority/status/category boards, AI priority scoring, AI task breakdowns
7. **Follow-Up Tracker** — track outstanding relationships, AI-drafted follow-up messages
8. **AI Command Center** — natural-language commands routed to the right action
9. **Contacts / CRM** — relationship history, related items, AI relationship summaries
10. **Notes & Meeting Notes** — capture notes, extract action items, summarize meetings with AI
11. **AI Memory** — what your assistant remembers about you, with privacy controls
12. **Notifications** — in-app reminders and AI alerts
13. **Settings** — profile, connected accounts, AI provider/tone, privacy
14. **Admin / Debug Panel** — users, AI activity logs, command logs, integration status, DB health (admin role only)

## Tech stack

- **Framework:** Next.js 16 (App Router, Server Actions, Route Groups)
- **Language:** TypeScript, React 19
- **Styling/UI:** Tailwind CSS v4, hand-built shadcn-style components on Radix primitives
- **Database/ORM:** PostgreSQL via Prisma 7 (`@prisma/adapter-pg`)
- **Auth:** Auth.js / NextAuth v5 (Credentials + optional Google OAuth)
- **Validation:** Zod
- **AI:** Provider-abstraction (`mock` | `openai` | `anthropic`) with graceful mock fallback

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in what you have. Everything is optional except `DATABASE_URL`
and `AUTH_SECRET` — the app degrades gracefully (mock AI, mock email/calendar sync) when
integrations aren't configured.

```bash
cp .env.example .env
```

Generate an auth secret:

```bash
npx auth secret
```

### 3. Set up the database

Point `DATABASE_URL` at a PostgreSQL database, then run:

```bash
npx prisma migrate dev --name init
```

### 4. Seed sample data

```bash
npm run db:seed
```

This creates a demo user and realistic sample data:

- 1 demo user (`demo@aiexec.app` / `password123`, admin role)
- 25 contacts, 10 emails, 8 calendar events
- 20 tasks, 15 follow-ups
- 10 notes, 5 meeting notes, 5 AI memory items
- 10 notifications, 2 integration account placeholders

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the demo credentials above
(or register a new account from the login page).

## Working without external services

- **No `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`?** All AI features (summaries, briefings, drafts,
  scoring, relationship summaries, command parsing, etc.) run through a deterministic **mock
  provider** that produces realistic, useful output. Add a key any time — the app automatically
  switches over per your Settings → AI provider preference, with the AI service layer always
  falling back to mock on any error.
- **No Google OAuth credentials?** Credentials (email/password) sign-in still works, and the
  Email/Calendar modules use realistic mock data instead of live Gmail/Calendar sync.

## Project structure

```
app/
  (app)/                # Authenticated route group (shared sidebar/topbar layout)
    dashboard/ command/ emails/ calendar/ tasks/ follow-ups/
    contacts/ notes/ memory/ notifications/ settings/ admin/
  login/                # Public auth pages
  api/auth/[...nextauth]/
components/
  ui/                   # Hand-built shadcn-style primitives (button, dialog, tabs, ...)
  layout/               # Sidebar, topbar, theme & session providers, nav config
  tasks/                # Shared badge helpers
lib/
  ai/                   # Provider abstraction, providers (mock/openai/anthropic), AI service functions
  auth/                 # NextAuth config + session helpers
  db/                   # Prisma client singleton
  integrations/         # Gmail / Google Calendar mock-first integration stubs
  validators/           # Zod schemas
services/               # Business logic over Prisma (one service per domain)
prisma/
  schema.prisma         # Full data model
  seed.ts               # Sample data generator
```

## Useful scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Lint the project |
| `npm run db:seed` | Seed the database with sample data |
| `npx prisma studio` | Browse/edit data in a GUI |
| `npx prisma migrate dev` | Create/apply migrations |

## Security notes

- Passwords are hashed with bcrypt; sessions use signed JWTs.
- AI activity is logged with **redacted/truncated summaries** (never full email bodies or notes)
  for auditability without storing sensitive content.
- Memory items can be marked **sensitive**, which masks them in the UI and excludes them from
  AI prompts.
