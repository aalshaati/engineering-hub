# /checkin — Daily and Weekly Health Check-In

A structured health check-in for Abdulla's lean-cut protocol. Runs entirely in Claude Code — reads files and Redis, writes results back to the same. No external AI API calls.

---

## Step 1 — Ask mode

Ask: **"Daily check-in or weekly review?"**

- **Daily** → follow the Daily Procedure below
- **Weekly** → follow the Weekly Procedure below

---

## Step 2 — Load context (both modes)

Read these three files before proceeding:

1. `/Users/abdulla/Documents/engineering-hub/coach/profile.md`
2. `/Users/abdulla/Documents/engineering-hub/coach/principles.md`
3. `/Users/abdulla/Documents/Engineering-Second-Brain/Engineering-Second-Brain/Engineering-Second-Brain/02_Projects/Health-Coach-Log.md`

---

## Step 3 — Morning weight (both modes)

First, check if today's record already has `weight_lb`:

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

### D1 — Pull today's data

```bash
cd /Users/abdulla/Documents/engineering-hub && node scripts/coach-redis.mjs read-day
```

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

### D5 — Daily verdict

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

### W7 — Update the Obsidian log

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
- Coach log: `/Users/abdulla/Documents/Engineering-Second-Brain/Engineering-Second-Brain/Engineering-Second-Brain/02_Projects/Health-Coach-Log.md`
- Env file: `/Users/abdulla/Documents/engineering-hub/.env.local`

---

## Rules this skill never breaks

- **No Anthropic API calls.** Runs entirely in Claude Code on the Pro plan.
- **Daily mode is read-mostly.** Only write: `weight_lb` into `health:daily:DATE` (via `write-weight`) in Step 3. No Obsidian log changes.
- **Weekly mode updates the Obsidian log.** Replace in-place, never append.
- **Missing data is not a blocker.** Null record = skip that day, note the gap, continue.
- **Rule 6 overrides user requests.** If Abdulla asks to cut harder or faster, refuse and explain why, then offer alternatives (better adherence, more steps, etc.).
- **BMR floor is dynamic.** Recompute Mifflin-St Jeor at current weight — do not use the 225 lb starting value after weight has dropped.
