@echo off
cd /d "%~dp0"
echo Starting AURORA P1 local server...
where python >nul 2>nul
if not errorlevel 1 (
  start "AURORA P1 server" cmd /k "python -m http.server 8123 --bind 127.0.0.1"
) else (
  where py >nul 2>nul
  if not errorlevel 1 (
    start "AURORA P1 server" cmd /k "py -m http.server 8123 --bind 127.0.0.1"
  ) else (
    where node >nul 2>nul
    if not errorlevel 1 (
      start "AURORA P1 server" cmd /k "node server.js"
    ) else (
      echo Python or Node.js is required to serve this ES Module demo.
      pause
      exit /b 1
    )
  )
)
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8123/"


