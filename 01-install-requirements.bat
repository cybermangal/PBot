@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [requirements] Preparing Pbot portable package...

call "scripts\resolve-node.bat" --install
if errorlevel 1 goto :fail
for %%D in ("%PBOT_NODE_EXE%") do set "PATH=%%~dpD;%PATH%"
"%PBOT_NODE_EXE%" -v

echo [requirements] Installing npm dependencies...
"%PBOT_NODE_EXE%" "%PBOT_NPM_CLI%" ci
if errorlevel 1 goto :fail

echo [requirements] Verifying scripts...
"%PBOT_NODE_EXE%" "%PBOT_NPM_CLI%" run check
if errorlevel 1 goto :fail

echo.
echo [requirements] Done.
echo [requirements] Start the UI and sign in with InitData if no active session is saved.
pause
exit /b 0

:fail
echo.
echo [requirements] Failed. See the error above.
pause
exit /b 1
