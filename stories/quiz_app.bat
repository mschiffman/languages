@echo off
rem Quiz maker: opens the page with the two quiz buttons in the browser. Close this window to stop it.
cd /d "%~dp0.."
python -E stories\quiz_app.py
pause
