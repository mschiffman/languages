@echo off
rem Story publisher: opens the dashboard in the browser. Close this window to stop it.
cd /d "%~dp0.."
python -E stories\story_app.py
pause
