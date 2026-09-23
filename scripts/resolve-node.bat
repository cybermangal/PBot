@echo off
rem Called by the launchers. Keep the resolved executables in the caller's environment.
set "PBOT_NODE_EXE="
set "PBOT_NPM_CLI="

call :find_node
if defined PBOT_NODE_EXE exit /b 0
if /i not "%~1"=="--install" exit /b 1

where winget >nul 2>nul
if errorlevel 1 (
  echo [node] Node.js 20+ with npm was not found, and winget is unavailable.
  exit /b 1
)

echo [node] Installing or updating Node.js LTS via winget...
winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
call :find_node
if defined PBOT_NODE_EXE exit /b 0

echo [node] Node.js 20+ with npm could not be found after installation.
exit /b 1

:find_node
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined PBOT_NODE_EXE call :try_node "%%~fN"
if defined PBOT_NODE_EXE exit /b 0
call :try_node "%ProgramFiles%\nodejs\node.exe"
if defined PBOT_NODE_EXE exit /b 0
call :try_node "%ProgramFiles(x86)%\nodejs\node.exe"
if defined PBOT_NODE_EXE exit /b 0
call :try_node "%LOCALAPPDATA%\Programs\nodejs\node.exe"
if defined PBOT_NODE_EXE exit /b 0
call :try_node "%LOCALAPPDATA%\nodejs\node.exe"
exit /b 0

:try_node
if not exist "%~1" exit /b 0
if not exist "%~dp1node_modules\npm\bin\npm-cli.js" exit /b 0
"%~1" -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >nul 2>nul
if errorlevel 1 exit /b 0
set "PBOT_NODE_EXE=%~1"
set "PBOT_NPM_CLI=%~dp1node_modules\npm\bin\npm-cli.js"
exit /b 0
