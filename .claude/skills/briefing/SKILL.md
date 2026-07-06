---
name: briefing
description: Morning briefing — creates or updates today's Obsidian daily note with a health snapshot, training status, and yesterday's shipped work. Use when Abdulla says "briefing", "morning briefing", or "make my daily note". Runs headlessly at 7am via launchd.
---

# /briefing — morning briefing into today's daily note

**HARD CONSTRAINT: this skill must be headless-safe. NEVER ask the user anything. Every data pull below that fails or returns nothing is noted in the output as "no data" and skipped — missing data is never blocking.**

**Vault daily notes folder (copy exactly, never retype):**
`/Users/abdulla/Documents/Engineering-Second-Brain/Engineering-Second-Brain/Engineering-Second-Brain/01_Daily/`
Template: `../06_Templates/Daily Note Template.md` (same vault root).

## Step 1 — Dates

Get today and yesterday in LA time (`date +%Y-%m-%d` and `date -v-1d +%Y-%m-%d`). The briefing always targets **today's** note.

## Step 2 — Data pulls (each one: skip silently on error)

1. **Health, yesterday + today:**
   `cd /Users/abdulla/Documents/engineering-hub && node scripts/coach-redis.mjs read-day <yesterday>` and `read-day <today>`.
   Targets for comparison: 2450 kcal, 180g protein. Yesterday <600 kcal or null = "no/partial log", not a real number.
2. **Training:** `mcp__hevy__get-workouts` with pageSize 5. Determine the last session's type (Push/Pull/Legs) and days since each group was trained, using the classification rules in the checkin skill's D5 step. Skip silently if Hevy is unavailable.
3. **Yesterday's shipped work:** `git log --since="yesterday 00:00" --oneline` in the engineering-hub repo.
4. **Carried-over focus:** find the most recent existing note in the `01_Daily/` folder (by filename date, excluding today). Collect its unchecked `- [ ]` items from `## 🎯 Today's Focus`.

## Step 3 — Write today's note (idempotent)

**If `01_Daily/<today>.md` already exists:** never overwrite or delete existing content. Only:
- add a `## ☀️ Morning Briefing` section (after the `# 📆` H1) if one is absent,
- add carried-over focus boxes that aren't already present in `## 🎯 Today's Focus`.

**If it doesn't exist:** create it from the template, with:
- Frontmatter `date:` and the H1 date filled with today's date.
- A `## ☀️ Morning Briefing` section inserted right after the H1 — 3 to 5 lines:
  - Yesterday's health snapshot: kcal and protein vs targets, morning weight if logged (one line).
  - Training status: last session type + date, and which PPL group is due next (one line).
  - Yesterday's commits: one-line summary, or "nothing shipped yesterday".
- `## 🎯 Today's Focus`: carried-over unchecked boxes first (verbatim), then 1–2 new boxes suggested from git state (in-progress work, obvious next steps), each suffixed `(suggested)`.
- All remaining template sections (`## 🪵 Vibe Coding & AI Log`, `## 🛑 Real-Time Debugging Ledger`, `## 🔗 Project & Concept Links`) included verbatim and empty, except set Active Project to `[[Engineering-Hub]]`.

Write with the Write/Edit tools on the absolute vault path.

## Step 4 — Summary line

End with exactly one line to stdout summarizing what happened, e.g.:
`Briefing written to 01_Daily/2026-07-05.md — 2380 kcal / 176g protein yesterday, legs due, 3 commits shipped.`
(This line becomes the launchd log entry.)

## Step 5 — Heartbeat (never skip)

Report the run to the agents dashboard, passing the Step 4 summary line:

```bash
node /Users/abdulla/Documents/engineering-hub/scripts/agent-heartbeat.mjs briefing ok "<Step 4 summary line>"
```

Use `failed` and a one-line error description instead of `ok` if the note could not be written. If this command errors, ignore it and continue — the heartbeat must never block or fail the skill.
