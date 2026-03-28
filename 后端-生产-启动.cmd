@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "PORT_TO_USE=%~1"
if "%PORT_TO_USE%"=="" set "PORT_TO_USE=63002"

set "DB_HOST=127.0.0.1"
set "DB_PORT=3309"
set "DB_USER=root"
set "DB_PASSWORD=123456"
set "DB_NAME=survey_system"
set "FRONTEND_URL=http://127.0.0.1:63000"
set "PORT=%PORT_TO_USE%"
set "NODE_ENV=production"

echo [INFO] Project root: %ROOT%
echo [INFO] Mode: production ^(single-run via npm start^)
echo [INFO] Requested backend port: %PORT%

where node >nul 2>nul || (
  echo [ERROR] Node.js was not found. Please install Node 18+ first.
  pause
  exit /b 1
)

where npm >nul 2>nul || (
  echo [ERROR] npm was not found. Please check your Node.js installation.
  pause
  exit /b 1
)

if not exist "%BACKEND_DIR%\package.json" (
  echo [ERROR] backend\package.json was not found.
  pause
  exit /b 1
)

pushd "%BACKEND_DIR%" || (
  echo [ERROR] Failed to enter backend directory.
  pause
  exit /b 1
)

if not exist ".env" if exist ".env.example" (
  copy /Y ".env.example" ".env" >nul
  echo [INFO] backend\.env created from .env.example
)

if not exist "node_modules\" (
  echo [INFO] Installing backend dependencies...
  call npm install || (
    echo [ERROR] npm install failed.
    popd
    pause
    exit /b 1
  )
) else (
  echo [INFO] Backend dependencies already installed.
)

set "LISTEN_PID="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do set "LISTEN_PID=%%p"
if defined LISTEN_PID (
  echo [INFO] Backend already running on http://127.0.0.1:%PORT% ^(PID: !LISTEN_PID!^)
  echo [INFO] If you need a restart, stop it first:
  echo        taskkill /PID !LISTEN_PID! /F
  popd
  pause
  exit /b 0
)

echo [INFO] Starting backend: http://127.0.0.1:%PORT%
echo [INFO] Database: %DB_HOST%:%DB_PORT% / %DB_NAME%
echo [INFO] Allowed frontend: %FRONTEND_URL%
echo [INFO] Test accounts:
echo        admin / 123456
echo        test1 / 123456

call npm start
set "EXIT_CODE=%ERRORLEVEL%"

popd
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Backend startup failed.
  pause
  exit /b %EXIT_CODE%
)

pause
