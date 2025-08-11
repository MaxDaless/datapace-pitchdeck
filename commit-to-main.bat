@echo off
echo ===============================================
echo   Datapace Pitch Deck - Git Commit Script
echo ===============================================
echo.

:: Check if we're in a git repository
git status >nul 2>&1
if errorlevel 1 (
    echo ERROR: Not a git repository!
    pause
    exit /b 1
)

:: Show current status
echo Current git status:
git status
echo.

:: Add all modified files
echo Adding modified files to staging...
git add index.html style.css script.js
echo.

:: Check if there are any changes to commit
git diff --cached --quiet
if not errorlevel 1 (
    echo No changes to commit.
    pause
    exit /b 0
)

:: Prompt for commit message
echo ===============================================
echo   COMMIT MESSAGE REQUIRED
echo ===============================================
echo Please describe what changes you made:
echo (e.g., "Fix pricing toggle", "Update slide content", etc.)
echo.
set /p commit_message="Enter your commit message: "

:: Ensure a message was provided
if "%commit_message%"=="" (
    echo.
    echo ERROR: Commit message is required!
    echo Please run the script again and provide a description.
    pause
    exit /b 1
)

:: Create commit with message
echo.
echo Committing with message: "%commit_message%"
git commit -m "%commit_message%


:: Pull any remote changes first
echo.
echo Pulling remote changes...
git pull origin main
if errorlevel 1 (
    echo ERROR: Failed to pull changes. Please resolve conflicts manually.
    pause
    exit /b 1
)

:: Push to main branch
echo.
echo Pushing to main branch...
git push origin main
if errorlevel 1 (
    echo ERROR: Failed to push to main branch.
    pause
    exit /b 1
)

echo.
echo ===============================================
echo   SUCCESS: Changes committed and pushed!
echo ===============================================
echo.
pause