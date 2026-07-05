# /checkin — Daily and Weekly Health Check-In

A structured health check-in for Abdulla's lean-cut protocol. Runs entirely in Claude Code — reads files and Redis, writes results back to the same. No external AI API calls.

---

## Step 1 — Determine mode

If the skill was invoked with an argument (e.g. `/checkin daily` or `/checkin weekly`), use that mode directly — do NOT ask.

Otherwise ask: **"Daily check-in or weekly review?"**

- **Daily** → follow the Daily Procedure below
- **Weekly** → follow the Weekly Procedure below

---

## Step 2 — Load context (both modes)

Read these files before proceeding:

1. `/Users/abdulla/Documents/engineering-hub/coach/profile.md`
2. `/Users/abdulla/Documents/engineering-hub/coach/principles.md`
3. `/Users/abdulla/Documents/engineering-hub/coach/training.md`
4. `/Users/abdulla/Documents/engineering-hub/coach/current-routine.md`
5. `/Users/abdulla/Documents/engineering-hub/coach/communication-style.md`
6. `/Users/abdulla/Documents/Engineering-Second-Brain/Engineering-Second-Brain/Engineering-Second-Brain/02_Projects/Health-Coach-Log.md`

---

## Step 3 — Pick the check-in date, then morning weight (both modes)

**Early-morning rule:** if the current LA time is **before 4am** and today's record is null, treat the check-in as covering **yesterday** — use yesterday's date for every `read-day` and present the snapshot labeled "YESTERDAY (date)". A post-midnight check-in is about the day that just ended, not the empty new one. (Weight handling below still applies, against that date's record.)

First, check if the check-in date's record already has `weight_lb`:

```bash
cd /Users/abdulla/Documents/engineering-hub && node scripts/coach-redis.mjs read-day
```

- **If `weight_lb` is non-null:** say "Weight already logged: XXX lb (from the Hub). Using that." Do NOT prompt and do NOT write — the Hub form is the source of truth.
- **If `weight_lb` is null:** ask **"What's your weight this morning? (lb — or 'skip')"**
  - If a number is given, write it:
    ```bash
    cd /Users/abdulla/Documents/engineering-hub && node scripts/coach-redis.mjs write-weight $(date +%Y-%m-%d) WEIGHT_VALUE
    ```
    Replace `WEIGHT_VALUE` with the number the user gave before running.
  - If skipped: note missing weight and continue.

---

## Daily Procedure

### D1 — Pull the check-in date's data

```bash
cd /Users/abdulla/Documents/engineering-hub && node scripts/coach-redis.mjs read-day
```

If the early-morning rule (Step 3) shifted the check-in to yesterday, pass that date explicitly: `read-day YYYY-MM-DD`.

The SDK auto-parses JSON on `.get()`. Fields to read from `record`: `calories_in`, `protein_g`, `carbs_g`, `fat_g`, `steps`, `calories_burned`, `sleep_hours`. Weight comes from the separate `weight_lb` field. A null record means no data yet today.

### D2 — Present the daily snapshot

```
── TODAY  (YYYY-MM-DD) ──────────────────────────────
  Calories in:   XXX / 2450 kcal   (XXX remaining)
  Protein:       XXX / 180 g       (XXX remaining)
  Carbs:         XXX / 240 g
  Fat:           XXX / 75 g (floor)
  Steps:         XXX
  Burned:        XXX kcal
  Sleep:         X.X h
  Weight:        XXX lb  (or: not logged today)
─────────────────────────────────────────────────────
```

If `calories_in` < 600 or record is null, note: "Partial-day snapshot — pipeline may still be syncing."

If `sleep_hours` is null, remind: "No sleep synced — open the Fitbit → Apple Health app and run its export, then let Health Auto Export sync." (Sleep comes from the Fitbit bridge app's manual export — free version has no auto-sync — so a missing value usually means the export wasn't run, not that sleep wasn't tracked. Don't treat it as a data-pipeline problem.)

### D3 — Protein gap with food suggestions

Calculate gap: `180 - protein_g`.

If gap > 0:
- Suggest 2–3 high-protein foods with approximate grams. Examples: "200g chicken breast ≈ 45g", "Greek yogurt 170g ≈ 17g", "3 whole eggs ≈ 18g", "1 scoop whey ≈ 25g", "200g cottage cheese ≈ 24g", "150g salmon ≈ 30g".
- If gap > 80g: "You'll need to prioritize protein heavily for the rest of the day."

If `protein_g >= 180`: "Protein target hit — solid."

### D4 — Hunger and energy check (Rule 6)

Ask: **"How's your hunger and energy today? (fine / a bit hungry / very hungry / low energy)"**

Apply principles rule 6:
- "Very hungry" or "low energy" → recommend adding 200–300 kcal (carbs or fat, not protein). Say: "Rule 6 says more food, not less — don't push through this."
- "A bit hungry" → note it; mild hunger in a deficit is normal, but flag if it persists multiple days in a row.
- "Fine" → good, hold targets.

### D5 — Rotation check (silent unless something looks off)

Check where the rolling PPL rotation stands against `coach/current-routine.md`. Read-only; never blocks the check-in.

1. Pull recent workouts via the Hevy MCP: `mcp__hevy__get-workouts` with `pageSize: 10`. If the Hevy MCP is unavailable or errors, **skip this step silently** — missing data is not a blocker.
2. Keep only sessions on/after **2026-06-02** (current PPL program — see `training.md` Rule 6).
3. Classify each session as Push / Pull / Legs:
   - If the title is literally "Push", "Pull", or "Legs" → use it.
   - Otherwise classify by exercises (titles like "Afternoon workout 💪" are unreliable): squat / RDL / leg curl / leg extension / calf raise → **Legs**; bench / shoulder press / chest fly / pec deck / lateral raise / triceps → **Push**; pulldown / pull-up / row / shrug / curl / rear delt → **Pull**.
4. Compute days since the most recent session of each type, and note the last two session types. **Hevy `startTime` is UTC** — convert to LA time before day math (an evening workout shows as the next UTC day).
5. **If the rotation looks on track → say nothing about it at all.** No status line, no praise. Per `current-routine.md`, 2-session weeks are fine and the rotation is day-agnostic — silence is the default.
6. Surface at most ONE short question only if one of these fires:
   - A muscle group hasn't been trained in **7+ days** (below even the 3/week floor for that group).
   - The **same session type ran twice in a row** while another group is ≥ 5 days stale.
   - **No sessions at all in 5+ days.**

   Frame it as a question, never an assumed problem — an intentional change is a fine answer. Example: *"Legs hasn't come up in 8 days — rotation still rolling, or did plans change?"* If the answer is intentional (extra cardio, recovery, schedule), accept it and move on; remember cardio counts as recovery load, not a missed session.

### D6 — Daily verdict

One or two sentences. Name what's on track and what needs attention before end of day.

**Do NOT:** compute trends, adjust targets, or write to the Obsidian log. Daily mode is read-mostly. The only write is `weight_lb` into `health:daily:DATE` in Step 3.

---

## Weekly Procedure

### W1 — Pull 14 days of data

```bash
cd /Users/abdulla/Documents/engineering-hub && node scripts/coach-redis.mjs read-days 14
```

A null record means no data for that day — mark as missing, do not abort. `weight_lb` comes from the separate weight key.

### W2 — Build the data table

Assemble all available days:

| Date | Weight (lb) | Cal In | Protein (g) | Steps | Burned |
|------|-------------|--------|-------------|-------|--------|

Note any gaps. If fewer than 4 days have `weight_lb`, note: "Insufficient weight data for trend — verdict will focus on intake adherence."

### W3 — Weight trend (Rule 5)

If ≥ 4 weight readings exist:
- Compute the 7-day rolling average for the most recent 7 days.
- Compute weekly rate of change in lb and as % of current bodyweight.
- Interpret per rule 5: flat or up after heavy training → likely water retention, hold intake. Down > 1% of current weight per week → approaching cap (recompute threshold at current weight, not fixed 2.25 lb).

If < 4 weight readings: skip trend math, note the gap, focus on intake adherence.

### W4 — Training context (Rule 7)

Ask: **"What training did you do in the last 3 days? (e.g., heavy lift, climbing, rest day, long cardio)"**

Use the answer to contextualize the scale reading per rule 7. Name it explicitly in the verdict.

### W5 — Walk the 8 principles in order

For each principle, state current status and whether action is needed:

1. **Rate (Rule 1)** — Weekly loss within 0.7–1%/wk? Compute 1% of *current* weight each check-in (not the fixed 225 lb starting value). Flag if exceeded.
2. **Protein (Rule 2)** — Protein ≥ 180g on most logged days? Flag specific days below target.
3. **Targets (Rule 3)** — Past the 2–3 week recalibration window? If yes, compute implied TDEE from actual loss vs logged intake. Compare to formula and recommend adjustment if warranted.
4. **Diet break (Rule 4)** — How many weeks into this cut? Any early triggers: strength dropping, all-consuming hunger, mood/sleep tanking?
5. **Scale reading (Rule 5)** — Trend read correctly (7-day average, not single day)?
6. **Safety (Rule 6)** — Any ease-off triggers? Check rate > 1%, fatigue, strength loss, sleep quality, intake vs dynamic BMR floor. Recompute Mifflin-St Jeor at *current* weight — the floor shrinks as weight drops. Flag immediately if intake is near it.
7. **Activity context (Rule 7)** — Named per W4 answer.
8. **Approaching goal (Rule 8)** — Current weight within 5–8 lb of 180? If yes, begin exit ramp: reverse diet 100–150 kcal/week, shift focus from fat loss to strength.

### W6 — Verdict

One clear decision: **keep cutting** / **adjust intake** / **diet break** / **start exit ramp**.

State the decision and the 1–2 rules that drove it. Name the training context. If adjusting intake, give the new kcal target and specify which macros change (carbs first, fat second, never protein).

### W7 — Refresh Hevy routine targets (progression upkeep)

Keep each routine's prescribed weights, rep targets, and notes in sync with what Abdulla actually lifted, so targets never go stale. **This is the only place the skill writes to Hevy.** Read-only otherwise.

1. Pull current routines (`mcp__hevy__get-routines`) and recent workouts (reuse the `get-workouts` data from the strength read; drop `warmup` sets — `training.md` Rule 0).
2. For each anchor lift / tracked accessory named in a routine's notes, find its most recent **working-set** performance.
3. Apply double progression (`training.md` Rule 2), conservatively (we're in a deficit):
   - **Earned a bump** — all working sets hit the *top* of the prescribed rep range at the prescribed weight → raise working weight one increment (~5 lb compounds, smallest plate/pin for accessories), reset reps toward the bottom of the range, and rewrite the note's "last: …" line + next target.
   - **Progressing but not topped out** → leave the weight; just refresh the "last: …" numbers to the latest session so the note doesn't drift.
   - **Maintaining or regressing** → do NOT bump (`training.md` Rule 4: maintenance is the win in a cut; never chase a stall with load — that routes to Rule 6). Refresh the "last: …" numbers only.
4. Only bump on genuinely earned progress, never a single fluke set. When unsure, hold and just refresh the note.
5. Write with `mcp__hevy__update-routine` (full exercise array; preserve order, rest times, rep ranges, and all other notes). **Embed the working weight + next target in the NOTE text too** — rep ranges set via API may not render in the Hevy app, but notes always do.
6. **Never** modify logged workouts, and **never** change exercise *selection* — adding/swapping/removing lifts is a separate explicit decision, not part of this upkeep. This step only touches weights, rep targets, and notes.
7. In the check-in output, summarize what was **bumped vs held**, with the numbers.

### W8 — Update the Obsidian log

Edit this file IN PLACE — replace sections, never append:

`/Users/abdulla/Documents/Engineering-Second-Brain/Engineering-Second-Brain/Engineering-Second-Brain/02_Projects/Health-Coach-Log.md`

**Replace the content of these three sections (keep the headers):**
- `## Current state` → updated weight, current phase/week number, active targets (kcal, protein, carbs, fat)
- `## Last verdict` → this week's verdict (2–4 sentences, include date)
- `## What to watch this week` → 3–5 bullet points for the coming 7 days

**Do NOT touch:**
- `## Lessons` — only add a one-liner if something genuinely new was learned this week; otherwise leave exactly as-is
- `## How this file evolves` — never modify

---

## Redis access reference

All Redis operations use the permanent helper at `scripts/coach-redis.mjs`. Call it with `node`, not `npx tsx` — it's plain ESM, no build step needed.

**Running environment (required every call):**
```bash
cd /Users/abdulla/Documents/engineering-hub && node scripts/coach-redis.mjs <command>
```
The `cd` is mandatory — Node resolves `@upstash/redis` from the project's `node_modules`. The helper strips surrounding quotes from `.env.local` values automatically (e.g. `TOKEN="abc"` → `abc`). No manual env prep needed.

**Helper commands:**
- `read-day [YYYY-MM-DD]` — reads `health:daily:DATE`; `weight_lb` is a field inside the record (default: today LA time)
- `read-days [n]` — reads last N days (default 14)
- `write-weight YYYY-MM-DD VALUE` — sets `weight_lb` inside `health:daily:DATE` (get/modify/set)

Env var names (confirmed):
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Key types:
- `health:daily:YYYY-MM-DD` — JSON object (written by ingest route and by `write-weight`). The SDK auto-parses JSON on read. Contains all health fields including `weight_lb`. The ingest route preserves `weight_lb` on every sync.

---

## File paths (hardcoded)

- Profile: `/Users/abdulla/Documents/engineering-hub/coach/profile.md`
- Principles: `/Users/abdulla/Documents/engineering-hub/coach/principles.md`
- Training: `/Users/abdulla/Documents/engineering-hub/coach/training.md`
- Current routine: `/Users/abdulla/Documents/engineering-hub/coach/current-routine.md`
- Communication style: `/Users/abdulla/Documents/engineering-hub/coach/communication-style.md`
- Coach log: `/Users/abdulla/Documents/Engineering-Second-Brain/Engineering-Second-Brain/Engineering-Second-Brain/02_Projects/Health-Coach-Log.md`
- Env file: `/Users/abdulla/Documents/engineering-hub/.env.local`

---

## Rules this skill never breaks

- **No Anthropic API calls.** Runs entirely in Claude Code on the Pro plan.
- **Daily mode is read-mostly.** Only write: `weight_lb` into `health:daily:DATE` (via `write-weight`) in Step 3. No Obsidian log changes.
- **Hevy: routine targets yes, logs never.** Weekly mode (step W7) may update routine *targets* — prescribed weights, rep targets, and coaching notes — via `update-routine` to keep them in sync with actual performance (`training.md` Rule 2). It must NEVER create/edit/delete logged workouts, and never changes exercise *selection* (adding/swapping lifts is a separate, explicit decision). Daily mode stays fully read-only on Hevy (`get-*` only).
- **Weekly mode updates the Obsidian log.** Replace in-place, never append.
- **Missing data is not a blocker.** Null record = skip that day, note the gap, continue.
- **Rule 6 overrides user requests.** If Abdulla asks to cut harder or faster, refuse and explain why, then offer alternatives (better adherence, more steps, etc.).
- **BMR floor is dynamic.** Recompute Mifflin-St Jeor at current weight — do not use the 225 lb starting value after weight has dropped.
