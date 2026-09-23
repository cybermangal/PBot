@echo off
setlocal EnableExtensions
cd /d "%~dp0"

call "scripts\resolve-node.bat"
if not errorlevel 1 goto :run

echo [start-ui] Node.js 20+ with npm is not found.
echo [start-ui] Run 01-install-requirements.bat first, then try again.
goto :fail

:run
echo [start-ui] Starting Pbot. Please keep this window open.
"%PBOT_NODE_EXE%" scripts\ui-server.js %*
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
