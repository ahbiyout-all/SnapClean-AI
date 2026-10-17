@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: SnapClean AI - Mobile Android Package Builder
:: Target: Android APK (snapcleanai-mobile-v%APP_VER%.apk)
:: Note: iPhone (iOS) installation file generation is suspended.
:: Repository: https://github.com/AhBiYout-all/SnapClean-AI
:: ============================================================================

title SnapClean AI - Mobile Package Builder

echo ============================================================================
echo      SnapClean AI - Mobile (Android APK) Packaging Pipeline
echo ============================================================================
echo.

:: ----------------------------------------------------------------------------
:: 1. Dynamic Version Extraction (Single Source of Truth)
:: ----------------------------------------------------------------------------
set APP_VER=
where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "usebackq tokens=*" %%i in (`node -p "require('./package.json').version" 2^>nul`) do set APP_VER=%%i
)

:: Fallback: Extract version from docs/PATCHNOTES.md if Node extraction fails
if "%APP_VER%"=="" (
    if exist "docs\PATCHNOTES.md" (
        for /f "tokens=2 delims=[]" %%a in ('findstr /R /C:"## 📌 \[v.*\]" docs\PATCHNOTES.md') do (
            set RAW_VER=%%a
            set APP_VER=!RAW_VER:v=!
            goto :ver_found
        )
    )
)

:ver_found
if "%APP_VER%"=="" (
    set APP_VER=2.4.0
    echo [WARNING] Could not determine version dynamically. Using fallback: v!APP_VER!
) else (
    echo [OK] Dynamic Version Detected: v!APP_VER!
)
echo.

:: ----------------------------------------------------------------------------
:: 2. Environment Verification
:: ----------------------------------------------------------------------------
echo [Step 1/3] Verifying environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required to execute the mobile packaging pipeline.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    where python3 >nul 2>nul
    if %errorlevel% neq 0 (
        echo [WARNING] Python3 not found in standard PATH. Zip fallback might be used.
    )
)
echo [OK] Environment verified.
echo.

if not exist "node_modules\" (
    echo [INFO] node_modules not detected. Installing dependencies via npm install...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install dependencies via npm install.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed.
    echo.
)

:: ----------------------------------------------------------------------------
:: 3. Execute Mobile Packaging Pipeline
:: ----------------------------------------------------------------------------
echo [Step 2/3] Generating Android APK and Apple iOS Packages...
call node scripts/build-mobile.js
if %errorlevel% neq 0 (
    echo [ERROR] Mobile build script failed with exit code %errorlevel%.
    pause
    exit /b %errorlevel%
)
echo.

:: ----------------------------------------------------------------------------
:: 4. Verify Built Artifacts
:: ----------------------------------------------------------------------------
echo [Step 3/3] Inspecting output artifacts in dist\mobile\...

set APK_FILE=dist\mobile\snapcleanai-mobile-v!APP_VER!.apk
set IPA_FILE=dist\mobile\snapcleanai-ios-v!APP_VER!.ipa
set CFG_FILE=dist\mobile\snapcleanai-ios.mobileconfig

if exist "!APK_FILE!" (
    for %%f in ("!APK_FILE!") do (
        echo   [ANDROID APK]   %%~dpnxf [%%~zf bytes]
    )
) else (
    echo   [WARNING] Android APK was not found at !APK_FILE!
)

if exist "!IPA_FILE!" (
    for %%f in ("!IPA_FILE!") do (
        echo   [APPLE IOS IPA] %%~dpnxf [%%~zf bytes]
    )
)

if exist "!CFG_FILE!" (
    for %%f in ("!CFG_FILE!") do (
        echo   [IOS PROFILE]   %%~dpnxf [%%~zf bytes]
    )
)

echo.
echo ============================================================================
echo ✨ Multiplatform Mobile Packages Built Successfully for v!APP_VER!!
echo.
echo 📱 Android Users:
echo    Install '!APK_FILE!' by allowing 'Unknown Sources' on your device.
echo.
echo 🍏 iPhone / iOS Users:
echo    1) MobileConfig Profile: Install '!CFG_FILE!' via iOS Settings for 1-tap app launch.
echo    2) IPA Sideloading: Sideload '!IPA_FILE!' via AltStore / Sideloadly / TrollStore.
echo    3) Safari PWA: Open Safari, tap Share, then tap 'Add to Home Screen'.
echo ============================================================================
echo.

pause
exit /b 0
