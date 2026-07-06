---
name: log
description: Add a dated build-log entry to the Engineering-Hub.md Obsidian note, derived from recent git history. Use when Abdulla says "update obsidian", "update the build log", "log this", or after shipping a feature.
---

# /log — Obsidian build-log entry

Records what shipped in the project's Obsidian build log. Writes to the vault by direct file path (no MCP).

**Target file (copy exactly, never retype):**
`/Users/abdulla/Documents/Engineering-Second-Brain/Engineering-Second-Brain/Engineering-Second-Brain/02_Projects/Engineering-Hub.md`

## Steps

1. **Find the last logged date.** Read the target file. Under the `## Build Log` heading, the first `### YYYY-MM-DD — …` entry is the most recent (the log is reverse-chronological, newest at top).

2. **Derive what shipped since then.** Run `git log --since=<last logged date> --stat --oneline` in the repo. If Abdulla just ran /ship, the relevant commits are usually the ones from today.

3. **Compose the entry, matching the existing entries' format exactly.** Read 1–2 existing entries first and imitate their structure. The established shape is:

   ```markdown
   ### YYYY-MM-DD — Short title of what shipped

   **Commit:** `shorthash` — pushed to GitHub, deployed to production

   **Feature or file area**
   - what changed and why, in plain language
   ```

   Keep it brief — this is a log, not documentation. Use today's date (LA time).

4. **Insert at the top of the section:** the new entry goes immediately after the `## Build Log` heading line, before the previous newest entry. Use the Edit tool on the absolute vault path.

5. **Idempotency:** if an entry for today's date already exists, extend that entry with the new bullets — do NOT create a second `###` heading for the same date.

6. **Heartbeat (never skip):** after the Build Log edit succeeds, report the run:

   ```bash
   node /Users/abdulla/Documents/engineering-hub/scripts/agent-heartbeat.mjs log ok "<entry title>"
   ```

   If this command errors, ignore it and continue — the heartbeat must never block or fail the skill.

## Rules
- Only touch the `## Build Log` section. Never modify `## Goal`, `## Decisions Made`, `## Concepts Learned`, or anything else in the file.
- Show Abdulla the entry text before writing it.
