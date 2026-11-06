@echo off
chcp 65001 >nul
title AgenceFlow - Mise en ligne sur Vercel
cd /d "%~dp0"
echo.
echo   Mise en ligne d'AgenceFlow CRM sur Vercel
echo   (relancez ce fichier apres chaque mise a jour pour republier)
node scripts\vercel-deploy.mjs
pause
