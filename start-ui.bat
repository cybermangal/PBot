@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "NODE_EXE=node"
where node >nul 2>nul
if not errorlevel 1 goto :run

if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
  goto :run
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
  goto :run
)

echo [start-ui] Node.js is not found.
echo [start-ui] Run 01-install-requirements.bat first, then try again.
goto :fail

:run
"%NODE_EXE%" scripts\ui-server.js %*
set "PBOT_EXIT_CODE=%errorlevel%"
if "%PBOT_EXIT_CODE%"=="0" exit /b 0

echo.
echo [start-ui] The server stopped with exit code %PBOT_EXIT_CODE%.
echo [start-ui] The error is shown above. Press any key to close this window.
pause >nul
exit /b %PBOT_EXIT_CODE%

:fail
echo.
echo [start-ui] Press any key to close this window.
pause >nul
exit /b 1
