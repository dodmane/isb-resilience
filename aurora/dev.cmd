@echo off
setlocal
cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%PATH%"
call "%ProgramFiles%\nodejs\npm.cmd" install --no-fund --no-audit
call "%ProgramFiles%\nodejs\npm.cmd" run dev
