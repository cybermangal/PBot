@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [setup] Preparing Pbot environment...

call "scripts\resolve-node.bat" --install
if errorlevel 1 exit /b %errorlevel%
for %%D in ("%PBOT_NODE_EXE%") do set "PATH=%%~dpD;%PATH%"
"%PBOT_NODE_EXE%" -v

echo [setup] Installing npm dependencies...
"%PBOT_NODE_EXE%" "%PBOT_NPM_CLI%" ci
if errorlevel 1 exit /b %errorlevel%

echo [setup] Verifying scripts...
"%PBOT_NODE_EXE%" "%PBOT_NPM_CLI%" run check
if errorlevel 1 exit /b %errorlevel%

echo [setup] Done. You can run start-ui.bat now.
exit /b 0
