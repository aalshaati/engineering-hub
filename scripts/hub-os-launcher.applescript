-- Hub OS launcher
-- Compiled to ~/Desktop/Hub OS.app via:
--   osacompile -o ~/Desktop/"Hub OS.app" scripts/hub-os-launcher.applescript
-- Shows a picker, then opens Terminal running Claude Code in the
-- engineering-hub repo with the matching skill. All intelligence stays
-- in Claude Code skills (no prompts embedded here).

set modeChoice to choose from list {"Daily check-in", "Weekly review", "Coach chat", "Briefing now", "Ship"} ¬
	with title "Hub OS" with prompt "What are we doing?" ¬
	default items {"Daily check-in"} without multiple selections allowed

if modeChoice is false then return -- user hit Cancel

set mode to item 1 of modeChoice

if mode is "Daily check-in" then
	set claudePrompt to "/checkin daily"
else if mode is "Weekly review" then
	set claudePrompt to "/checkin weekly"
else if mode is "Coach chat" then
	set claudePrompt to "/coach"
else if mode is "Briefing now" then
	set claudePrompt to "/briefing"
else
	set claudePrompt to "/ship"
end if

set shellCommand to "cd ~/Documents/engineering-hub && claude " & quoted form of claudePrompt

tell application "Terminal"
	activate
	do script shellCommand
end tell
