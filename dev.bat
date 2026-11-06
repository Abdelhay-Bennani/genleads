@echo off
chcp 65001 >nul
title AgenceFlow CRM (developpement)
cd /d "%~dp0"
node scripts\setup.mjs || (pause & exit /b 1)
start "" http://localhost:5173
call npm run dev
pause
