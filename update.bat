@echo off
REM Recipe Box updater — double-click this file any time you have new
REM files to publish (e.g. after copying in an update Claude sent you).
REM It installs any dependency changes, builds the app, and pushes it
REM to GitHub Pages, all in one step.

cd /d "%~dp0"

echo ============================
echo   Updating Recipe Box...
echo ============================
echo.

call npm install
if errorlevel 1 (
    echo.
    echo npm install failed - see the error above.
    pause
    exit /b 1
)

call npm run deploy
if errorlevel 1 (
    echo.
    echo Deploy failed - see the error above.
    pause
    exit /b 1
)

echo.
echo ============================
echo   Done! Your changes are live.
echo   Give GitHub Pages a minute or two, then reopen the app.
echo   https://msloskey-i-want-that.github.io/recipe-box/
echo ============================
echo.
pause
