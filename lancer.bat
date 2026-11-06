@echo off
chcp 65001 >nul
title AgenceFlow CRM
cd /d "%~dp0"
echo [%date% %time%] Lancement v2 (production)> lancer.log
where node >> lancer.log 2>&1
if errorlevel 1 (
  echo NODE_ABSENT>> lancer.log
  echo   Node.js n'est pas installe. Installez la version LTS depuis https://nodejs.org
  start "" https://nodejs.org/fr/download
  pause
  exit /b 1
)
node -v >> lancer.log 2>&1
if not exist node_modules\next\package.json (
  echo   Installation des dependances, 2 a 3 minutes la premiere fois...
  call npm install >> lancer.log 2>&1
  if errorlevel 1 (
    echo NPM_INSTALL_ECHEC>> lancer.log
    echo   Echec de l'installation : voir le fichier lancer.log
    pause
    exit /b 1
  )
)
node scripts\setup.mjs
if errorlevel 1 (
  echo SETUP_ECHEC>> lancer.log
  pause
  exit /b 1
)
echo SETUP_OK>> lancer.log
node scripts\need-build.mjs
if not errorlevel 1 (
  echo.
  echo   Preparation de la version optimisee, 1 a 2 minutes apres chaque mise a jour...
  call npm run build >> lancer.log 2>&1
  if errorlevel 1 (
    echo BUILD_ECHEC>> lancer.log
    echo   Echec de la preparation : voir le fichier lancer.log
    pause
    exit /b 1
  )
  node scripts\mark-build.mjs
)
echo BUILD_OK>> lancer.log
set COOKIE_SECURE=false
echo.
echo   AgenceFlow CRM est disponible sur http://localhost:5173
echo   Fermez cette fenetre pour arreter l'application.
echo.
start "" http://localhost:5173
call npm start
echo SERVEUR_ARRETE>> lancer.log
pause
