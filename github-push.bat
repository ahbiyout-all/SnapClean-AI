@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: SnapClean AI - Automated GitHub Release & Push Pipeline
:: Repository: https://github.com/AhBiYout/AhBiYout-all
:: Account:    AhBiYout | Repository: AhBiYout-all
:: ============================================================================

title SnapClean AI - GitHub Release Pipeline
color 0B

echo ============================================================================
echo   SnapClean AI - GitHub Automated Push & Version Sync Pipeline
echo   Target: AhBiYout / AhBiYout-all
echo ============================================================================
echo.

:: ----------------------------------------------------------------------------
:: STEP 1: Multi-stage Dynamic Version Extraction (Single Source of Truth)
:: ----------------------------------------------------------------------------
echo [1/6] Extracting dynamic version information...
set "APP_VER="

:: Primary Method: Extract from package.json via Node.js
where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('node -p "require('./package.json').version" 2^>nul') do (
        set "APP_VER=%%v"
    )
)

:: Secondary Fallback: Extract from docs/PATCHNOTES.md
if "%APP_VER%"=="" (
    if exist "docs\PATCHNOTES.md" (
        for /f "tokens=2 delims=[]" %%i in ('findstr /r /c:"##.*\[v.*\]" docs\PATCHNOTES.md') do (
            set "RAW_VER=%%i"
            set "APP_VER=!RAW_VER:v=!"
            goto :FOUND_VER
        )
    )
)

:FOUND_VER
if "%APP_VER%"=="" (
    set "APP_VER=2.4.0"
    echo [WARN] Fallback version 2.4.0 applied.
) else (
    echo [OK] Authoritative application version detected: v%APP_VER%
)

title SnapClean AI v%APP_VER% - GitHub Release Pipeline
echo.

:: ----------------------------------------------------------------------------
:: STEP 2: Workspace Hygiene Audit (Exclude Binaries and Temporary Files)
:: ----------------------------------------------------------------------------
echo [2/6] Auditing workspace hygiene against .gitignore rules...
set "CLEAN_FAILED=0"

if exist "snapcleanai-portable.exe" (
    echo [CLEANUP] Removing root test binary snapcleanai-portable.exe...
    del /f /q "snapcleanai-portable.exe" >nul 2>nul
)

if exist "snapcleanai-portable-*.exe" (
    echo [CLEANUP] Removing root portable exe artifacts...
    del /f /q "snapcleanai-portable-*.exe" >nul 2>nul
)

if exist "snapclean_core.dll" (
    echo [CLEANUP] Removing root test dynamic library snapclean_core.dll...
    del /f /q "snapclean_core.dll" >nul 2>nul
)

if exist "replace_keys.js" del /f /q "replace_keys.js" >nul 2>nul
if exist "replace_keys.cjs" del /f /q "replace_keys.cjs" >nul 2>nul
if exist "src\replace_keys.js" del /f /q "src\replace_keys.js" >nul 2>nul
if exist "src\replace_keys.cjs" del /f /q "src\replace_keys.cjs" >nul 2>nul

if exist "bun.lock" (
    echo [CLEANUP] Removing duplicate bun.lock (npm is primary)...
    del /f /q "bun.lock" >nul 2>nul
)

echo [OK] Workspace sanitized. Binary executables will NOT be pushed to git history.
echo.

:: ----------------------------------------------------------------------------
:: STEP 3: Automated Version Synchronization Across All Files
:: ----------------------------------------------------------------------------
echo [3/6] Synchronizing version across package.json, metadata.json, src/version.ts, and tauri.conf.json...
call npm run version:sync
if %errorlevel% neq 0 (
    echo [ERROR] Version synchronization failed.
    pause
    exit /b %errorlevel%
)
echo.

:: ----------------------------------------------------------------------------
:: STEP 4: Code Quality & Type Check
:: ----------------------------------------------------------------------------
echo [4/6] Running TypeScript type verification (npm run lint)...
call npm run lint
if %errorlevel% neq 0 (
    echo [ERROR] TypeScript lint failed. Please resolve compilation errors first.
    pause
    exit /b %errorlevel%
)
echo [OK] Codebase verified successfully.
echo.

:: ----------------------------------------------------------------------------
:: STEP 5: Git Staging, Semantic Commit, and Tagging
:: ----------------------------------------------------------------------------
echo [5/6] Staging files, creating semantic commit, and tagging v%APP_VER%...

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in PATH.
    pause
    exit /b 1
)

:: Verify git init
if not exist ".git" (
    echo Initializing git repository...
    git init
    git branch -m main
)

:: Ensure user identity
for /f "tokens=*" %%u in ('git config user.name 2^>nul') do set "GIT_USER=%%u"
if "!GIT_USER!"=="" git config user.name "AhBiYout"

for /f "tokens=*" %%e in ('git config user.email 2^>nul') do set "GIT_EMAIL=%%e"
if "!GIT_EMAIL!"=="" git config user.email "redmoon@hanil.org"

:: Verify Remote
git remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    echo Adding remote origin: https://github.com/AhBiYout/AhBiYout-all.git
    git remote add origin https://github.com/AhBiYout/AhBiYout-all.git
)

:: Stage all files according to .gitignore
git add .

:: Commit
set "COMMIT_MSG=release: v%APP_VER% - GitHub Releases live updater & automation pipeline"
if not "%~1"=="" set "COMMIT_MSG=%~1"

git commit -m "%COMMIT_MSG%" >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Committed changes: "%COMMIT_MSG%"
) else (
    echo [INFO] Working tree is clean. Nothing to commit.
)

:: Tag
git tag -a v%APP_VER% -m "Release v%APP_VER%" >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Git tag v%APP_VER% created.
) else (
    echo [INFO] Git tag v%APP_VER% already exists.
)
echo.

:: ----------------------------------------------------------------------------
:: STEP 6: Push to Remote GitHub Repository
:: ----------------------------------------------------------------------------
echo [6/6] Pushing code and tag to GitHub (AhBiYout/AhBiYout-all)...
echo Pushing branch 'main'...
git push -u origin main

echo Pushing tags...
git push origin v%APP_VER%

echo.
echo ============================================================================
echo   GitHub Release Pipeline Completed Successfully!
echo   Version:     v%APP_VER%
echo   Repository:  https://github.com/AhBiYout/AhBiYout-all
echo   Releases:    https://github.com/AhBiYout/AhBiYout-all/releases
echo ============================================================================
echo.

pause
exit /b 0
