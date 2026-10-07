@echo off
title Star Citizen DM Bot
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo Download the LTS version from https://nodejs.org, install it, then double-click start.bat again.
  echo.
  start https://nodejs.org
  pause
  exit /b 1
)

if not exist ".env" (
  echo.
  echo ===== First-time setup =====
  echo Get these from https://discord.com/developers/applications  ^(see README^)
  echo.
  set /p TOKEN=Paste your BOT TOKEN and press Enter:
  set /p CLIENT=Paste your APPLICATION ID and press Enter:
  set /p GUILD=Paste your SERVER ID and press Enter:
  echo.
  echo Optional: an OpenRouter key makes the AI write the stories. Press Enter to skip.
  set /p ORKEY=Paste your OPENROUTER KEY, or just press Enter: 
  call :writeenv
)

node scripts\needs-install.cjs
if errorlevel 1 (
  echo Installing the bot's parts ^(only needed after an update^)...
  call npm install --omit=dev --no-audit --no-fund
  if errorlevel 1 goto failed
  node scripts\needs-install.cjs --done
)

echo Checking slash commands...
call npm run deploy
if errorlevel 1 goto failed

echo.
echo Starting the bot. Leave this window open while you play. Close it to stop the bot.
echo.
call npm start
pause
exit /b 0

:writeenv
> .env echo DISCORD_TOKEN=%TOKEN%
>> .env echo CLIENT_ID=%CLIENT%
>> .env echo GUILD_ID=%GUILD%
>> .env echo OPENROUTER_API_KEY=%ORKEY%
>> .env echo OPENROUTER_MODEL=openrouter/auto
>> .env echo ANTHROPIC_API_KEY=
echo Saved your settings to .env
exit /b 0

:failed
echo.
echo Something went wrong. Check the message above.
echo If the token or IDs were wrong, delete the .env file and run start.bat again.
pause
exit /b 1
