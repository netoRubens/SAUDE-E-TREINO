@echo off
cd /d "%~dp0"
if not exist vendor\dexie.min.js call npm run setup
start http://localhost:8000
call npm start
