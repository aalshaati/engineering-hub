-- Health Coach launcher
-- Compiled to ~/Desktop/Health Coach.app via:
--   osacompile -o ~/Desktop/"Health Coach.app" scripts/health-coach-launcher.applescript
-- Shows a mode picker, then opens Terminal running Claude Code in the
-- engineering-hub repo with the matching starting prompt. All coaching
-- intelligence stays in Claude Code (no Anthropic API calls).

set modeChoice to choose from list {"Daily check-in", "Weekly review", "Coach chat"} ¬
	with title "Health Coach" with prompt "What are we doing today?" ¬
	default items {"Daily check-in"} without multiple selections allowed

if modeChoice is false then return -- user hit Cancel

set mode to item 1 of modeChoice

if mode is "Daily check-in" then
	set claudePrompt to "/checkin daily"
else if mode is "Weekly review" then
	set claudePrompt to "/checkin weekly"
else
	set claudePrompt to "Coach chat (no formal check-in): read coach/profile.md, coach/principles.md, coach/training.md, coach/current-routine.md, coach/communication-style.md and the Health-Coach-Log.md in my Obsidian vault, then greet me briefly and let me ask about workouts, nutrition, or anything health related. Pull Redis health data or Hevy workouts only if the conversation needs them. Hold the same rules as a check-in (Rule 6 safety included) but keep it conversational."
end if

set shellCommand to "cd ~/Documents/engineering-hub && claude " & quoted form of claudePrompt

tell application "Terminal"
	activate
	do script shellCommand
end tell
