@echo off
setlocal
cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%PATH%"

where docker >nul 2>&1
if errorlevel 1 (
  set "DOCKER_EXE=%USERPROFILE%\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"
  if not exist "%DOCKER_EXE%" (
    echo Docker Desktop is not installed or not available on PATH.
    echo Please install Docker Desktop and make sure it is running.
    exit /b 1
  )
  set "DOCKER_BIN=%DOCKER_EXE%"
) else (
  set "DOCKER_BIN=docker"
)

where npm >nul 2>&1
if errorlevel 1 (
  set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
  if not exist "%NPM_CMD%" (
    echo Node.js LTS is not installed.
    echo Please install Node.js LTS from https://nodejs.org/
    exit /b 1
  )
  set "NPM_BIN=%NPM_CMD%"
) else (
  set "NPM_BIN=npm"
)

echo Installing dependencies...
if "%NPM_BIN%"=="npm" (
  call npm install --no-fund --no-audit
) else (
  call "%NPM_BIN%" install --no-fund --no-audit
)

echo.
echo Building and starting AURORA...
if "%DOCKER_BIN%"=="docker" (
  docker compose up --build -d
) else (
  "%DOCKER_BIN%" compose up --build -d
)

echo.
echo AURORA is running at http://localhost:3000
echo To stop it: docker compose down
exit /b 0
