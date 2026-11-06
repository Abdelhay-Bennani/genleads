@echo off
chcp 65001 >nul
title AgenceFlow - Envoi sur GitHub
cd /d "%~dp0"
node scripts\github-push.mjs
pause
