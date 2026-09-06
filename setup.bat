@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [setup] Preparing Pbot environment...

call :ensure_node
if errorlevel 1 exit /b %errorlevel%

echo [setup] Installing npm dependencies...
call npm ci
if errorlevel 1 exit /b %errorlevel%

echo [setup] Verifying scripts...
call npm run check
if errorlevel 1 exit /b %errorlevel%

echo [setup] Done. You can run start-ui.bat now.
exit /b 0

:ensure_node
where node >nul 2>nul
if not errorlevel 1 goto :node_ok

echo [setup] Node.js is not found in PATH.
where winget >nul 2>nul
if errorlevel 1 (
  echo [setup] winget is not available.
  echo [setup] Install Node.js 20 LTS manually, then run setup.bat again.
  exit /b 1
)

echo [setup] Installing Node.js LTS via winget...
winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  echo [setup] Node.js install failed.
  exit /b 1
)

if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo [setup] Node.js was installed but is not visible in this shell yet.
  echo [setup] Open a new terminal and run setup.bat again.
  exit /b 1
)

:node_ok
for /f "tokens=* usebackq" %%v in (`node -v`) do set NODE_VERSION=%%v
echo [setup] Node.js detected: %NODE_VERSION%
exit /b 0
