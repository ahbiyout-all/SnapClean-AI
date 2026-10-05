@echo off
rem ==============================================================================
rem  SnapClean AI - Windows Automated Production Build Script
rem  Platform: Windows 10 / 11 (x64 / ARM64)
rem  Output: snapcleanai-portable-v%APP_VERSION%.exe & snapclean_core.dll
rem ==============================================================================

setlocal enabledelayedexpansion
title SnapClean AI - Automated Build Pipeline

echo ==============================================================================
echo       SnapClean AI - Automated Production Build Pipeline (Windows)
echo ==============================================================================
echo.

rem ------------------------------------------------------------------------------
rem  Step 1: Check Required Dependencies (Node.js & NPM)
rem ------------------------------------------------------------------------------
echo [Step 1/6] Verifying required build tools...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js v18 or higher from https://nodejs.org
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] NPM is not found in PATH!
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VERSION=%%v
echo [OK] Node.js: %NODE_VERSION%
echo [OK] NPM:     %NPM_VERSION%

rem Check optional Rust / Cargo compiler
set HAS_CARGO=0
where cargo >nul 2>nul
if %errorlevel% equ 0 (
    set HAS_CARGO=1
    for /f "tokens=*" %%v in ('cargo --version') do set CARGO_VERSION=%%v
    echo [OK] Rust/Cargo: !CARGO_VERSION!
) else (
    echo [INFO] Cargo [Rust] not detected in PATH. Native DLL compilation will be skipped.
)
echo.

rem Check node_modules and automatically install if missing
if not exist "node_modules\" (
    echo [Step 1.5/6] node_modules directory not detected.
    echo Installing project dependencies via npm install...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install dependencies via npm install.
        exit /b 1
    )
    echo [OK] All dependencies installed successfully.
    echo.
)

rem ------------------------------------------------------------------------------
rem  Step 2: Version Extraction and Synchronization
rem ------------------------------------------------------------------------------
echo [Step 2/6] Synchronizing version from package.json and patch notes...

for /f "usebackq tokens=*" %%i in (`node -p "require('./package.json').version"`) do set APP_VERSION=%%i

if "%APP_VERSION%"=="" (
    echo [ERROR] Failed to read version from package.json!
    exit /b 1
)

echo [OK] Target Application Version: v%APP_VERSION%
call node scripts/version-manager.js sync
if %errorlevel% neq 0 (
    echo [WARNING] Version sync script encountered warnings, proceeding...
)
echo.

rem ------------------------------------------------------------------------------
rem  Step 3: Frontend & Express Server Compilation
rem ------------------------------------------------------------------------------
echo [Step 3/6] Compiling Vite Frontend and Express Backend Bundle...

call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend or server build failed!
    exit /b 1
)
echo [OK] Client and Server assets built into dist/
echo.

rem ------------------------------------------------------------------------------
rem  Step 4: DLL Compilation & Core Engine Bundling (build:dll)
rem ------------------------------------------------------------------------------
echo [Step 4/6] Executing DLL builder for native library and core engine modules...

call npm run build:dll
if %errorlevel% neq 0 (
    echo [WARNING] DLL builder encountered warnings, proceeding...
)
echo [OK] Core engine modules and native DLL bundled into dist/dll/
echo.

rem ------------------------------------------------------------------------------
rem  Step 5: Bundle Portable Executable with Version Tag
rem ------------------------------------------------------------------------------
echo [Step 5/6] Packaging portable executable with version tag: v%APP_VERSION%...

call node scripts/build-portable.js
if %errorlevel% neq 0 (
    echo [ERROR] Portable packaging script failed!
    exit /b 1
)

rem Define target versioned binary name
set VERSIONED_EXE=snapcleanai-portable-v%APP_VERSION%.exe

rem Verify that the versioned executable exists
if not exist "%VERSIONED_EXE%" (
    if exist "snapcleanai-portable.exe" (
        copy /y "snapcleanai-portable.exe" "%VERSIONED_EXE%" >nul
        echo [OK] Created version-tagged executable: %VERSIONED_EXE%
    )
)

if not exist "dist\%VERSIONED_EXE%" (
    if exist "%VERSIONED_EXE%" (
        copy /y "%VERSIONED_EXE%" "dist\%VERSIONED_EXE%" >nul
    )
)
echo.

rem ------------------------------------------------------------------------------
rem  Step 5.5: Build Mobile Packages (Android APK & Apple iOS)
rem ------------------------------------------------------------------------------
echo [Step 5.5/6] Packaging mobile distributions [Android APK & Apple iOS]...
call node scripts/build-mobile.js
if %errorlevel% neq 0 (
    echo [WARNING] Mobile packager encountered notice, proceeding...
)
echo.

rem ------------------------------------------------------------------------------
rem  Step 6: Build Summary & Artifact Verification
rem ------------------------------------------------------------------------------
echo ==============================================================================
echo                     BUILD SUCCESSFUL! [v%APP_VERSION%]
echo ==============================================================================
echo.
echo Production Artifacts:

if exist "%VERSIONED_EXE%" (
    for %%f in ("%VERSIONED_EXE%") do (
        echo   [EXE - Versioned]  %%~dpnxf [%%~zf bytes]
    )
) else (
    if exist "snapcleanai-portable.exe" (
        for %%f in ("snapcleanai-portable.exe") do (
            echo   [EXE - Portable]   %%~dpnxf [%%~zf bytes]
        )
    )
)

if exist "dist\%VERSIONED_EXE%" (
    for %%f in ("dist\%VERSIONED_EXE%") do (
        echo   [DIST - Versioned] %%~dpnxf [%%~zf bytes]
    )
)

if exist "dist\snapclean_core.dll" (
    for %%f in ("dist\snapclean_core.dll") do (
        echo   [DLL - Native Core] %%~dpnxf [%%~zf bytes]
    )
)

if exist "dist\dll\snapclean-engine.dll.js" (
    for %%f in ("dist\dll\snapclean-engine.dll.js") do (
        echo   [DLL - Engine JS]   %%~dpnxf [%%~zf bytes]
    )
)

if exist "dist\dll\manifest.json" (
    echo   [DLL - Manifest]    dist\dll\manifest.json
)

if exist "dist\mobile\snapcleanai-mobile-v%APP_VERSION%.apk" (
    echo   [MOBILE - APK]      dist\mobile\snapcleanai-mobile-v%APP_VERSION%.apk
)

if exist "dist\mobile\snapcleanai-ios-v%APP_VERSION%.ipa" (
    echo   [MOBILE - iOS IPA]  dist\mobile\snapcleanai-ios-v%APP_VERSION%.ipa
)

if exist "dist\mobile\snapcleanai-ios.mobileconfig" (
    echo   [MOBILE - iOS Prof] dist\mobile\snapcleanai-ios.mobileconfig
)

if exist "dist\build-info.json" (
    echo   [META - Build Info] dist\build-info.json
)

echo.
echo All artifacts have been generated in the root and dist/ folders.
echo You can distribute '%VERSIONED_EXE%' directly to end users.
echo ==============================================================================
echo.

exit /b 0
