@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [requirements] Preparing Pbot portable package...

call :ensure_node
if errorlevel 1 goto :fail

echo [requirements] Installing npm dependencies...
call npm ci
if errorlevel 1 goto :fail

echo [requirements] Verifying scripts...
call npm run check
if errorlevel 1 goto :fail

echo.
echo [requirements] Done.
echo [requirements] Start the UI and sign in with InitData if no active session is saved.
pause
exit /b 0

:ensure_node
where node >nul 2>nul
if not errorlevel 1 goto :node_ok

echo [requirements] Node.js is not found in PATH.
where winget >nul 2>nul
if errorlevel 1 (
  echo [requirements] winget is not available.
  echo [requirements] Install Node.js 20 LTS manually, then run this file again.
  exit /b 1
)

echo [requirements] Installing Node.js LTS via winget...
winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 exit /b 1

if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo [requirements] Node.js was installed but is not visible in this shell yet.
  echo [requirements] Open a new terminal and run this file again.
  exit /b 1
)

:node_ok
for /f "tokens=* usebackq" %%v in (`node -v`) do set NODE_VERSION=%%v
echo [requirements] Node.js detected: %NODE_VERSION%
exit /b 0

:fail
echo.
echo [requirements] Failed. See the error above.
pause
exit /b 1
