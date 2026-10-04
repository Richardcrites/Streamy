@echo off
title DM Link (Star Citizen)
cd /d "%~dp0"
where node >/dev/null 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Get the LTS version from https://nodejs.org, then run link.bat again.
  start https://nodejs.org
  pause
  exit /b 1
)
node link\dm-link.js %*
pause
