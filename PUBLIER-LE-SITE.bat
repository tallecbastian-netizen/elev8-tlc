@echo off
chcp 65001 >nul
cd /d "%~dp0"
set LOG=publish-log.txt
echo Publication du site Bastian Tallec - %date% %time% > "%LOG%"

where git >nul 2>&1
if errorlevel 1 (
  echo ERREUR : Git introuvable dans le PATH. >> "%LOG%"
  echo.
  echo Git n'a pas ete trouve. Ouvre "Git Bash" une fois, ou reinstalle Git, puis relance.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 git init >> "%LOG%" 2>&1

git config user.email >nul 2>&1 || git config user.email "tallecbastian-netizen@users.noreply.github.com"
git config user.name  >nul 2>&1 || git config user.name  "Bastian Tallec"

git add -A >> "%LOG%" 2>&1
git commit -m "Mise en ligne du site Bastian Tallec" >> "%LOG%" 2>&1
git branch -M main >> "%LOG%" 2>&1
git remote remove origin >> "%LOG%" 2>&1
git remote add origin https://github.com/tallecbastian-netizen/Landing-Page.git >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo === ENVOI VERS GITHUB === >> "%LOG%"
echo.
echo  Si une fenetre de connexion GitHub s'ouvre : connecte-toi pour autoriser l'envoi.
echo.
git push -u origin main --force >> "%LOG%" 2>&1

echo. >> "%LOG%"
echo === TERMINE === >> "%LOG%"
echo.
echo  C'est envoye. Detail complet dans le fichier publish-log.txt
echo  Prochaine etape : activer GitHub Pages (voir les instructions de Claude).
echo.
pause
