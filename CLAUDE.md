@AGENTS.md

# Engineering Hub

Abdulla's personal AI Engineering Hub — a Next.js 16 app used daily. Pages: dashboard/daily briefing (`/`), projects, notes, chat, investing, health. Deployed on Vercel.

## Deploy model
- Push to `main` on GitHub → Vercel auto-deploys to production. There is no separate deploy step.
- Verify deploys with the Vercel MCP: `list_deployments` → check the newest deployment's state for the pushed SHA.

## Coach system (health/fitness coaching)
- Context files (read all before coaching): `coach/profile.md`, `coach/principles.md` (8 priority-ordered rules; Rule 6 safety overrides all), `coach/training.md`, `coach/current-routine.md`, `coach/communication-style.md`, `coach/hevy-data-notes.md`.
- Daily targets: 2450 kcal, 180g protein, 240g carbs, 75g fat floor.
- Health data lives in Upstash Redis, key `health:daily:YYYY-MM-DD`. Access via the helper (run from this directory; it parses `.env.local` itself):
  - `node scripts/coach-redis.mjs read-day [YYYY-MM-DD]`
  - `node scripts/coach-redis.mjs read-days [n]` (default 14)
  - `node scripts/coach-redis.mjs write-weight YYYY-MM-DD VALUE`
- Workout history/routines come from the Hevy MCP (`mcp__hevy__*`). Never modify logged workouts; routine updates only happen in the supervised weekly review.

## Obsidian vault (write via direct file paths, NOT an MCP — none is registered for this project)
- Vault: `/Users/abdulla/Documents/Engineering-Second-Brain/Engineering-Second-Brain/Engineering-Second-Brain` (triple-nested path is correct — copy it, never retype)
- Daily notes: `01_Daily/YYYY-MM-DD.md`, template at `06_Templates/Daily Note Template.md`
- Build log: `02_Projects/Engineering-Hub.md` → `## Build Log`, reverse-chronological `### YYYY-MM-DD — title` entries (newest at top)
- Health coach log: `02_Projects/Health-Coach-Log.md` (weekly review write-back target; replace sections in place, never append)

## Skills
- `/checkin daily` / `/checkin weekly` — full health check-in (also `/daily`, `/weekly` shortcuts)
- `/coach` — conversational coaching, no writes
- `/briefing` — morning briefing; creates today's Obsidian daily note (headless-safe)
- `/log` — append a build-log entry to Engineering-Hub.md from recent git history
- `/ship` — global skill: commit, push, verify Vercel deploy

## Environment
- `.env.local` holds: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ANTHROPIC_API_KEY`, `OBSIDIAN_VAULT_PATH`. Never print or commit values; never stage `.env*`.
