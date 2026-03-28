@echo off
setlocal
chcp 65001 >nul

set "ROOT=%~dp0"
set "FRONTEND_DIR=%ROOT%frontend"
set "FRONTEND_PORT=63000"
set "BACKEND_PORT=63002"

echo [INFO] Project root: %ROOT%
echo [INFO] Mode: development ^(Vite dev server with HMR^)

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

if not exist "%FRONTEND_DIR%\package.json" (
  echo [ERROR] frontend\package.json was not found.
  pause
  exit /b 1
)

pushd "%FRONTEND_DIR%" || (
  echo [ERROR] Failed to enter frontend directory.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [INFO] Installing frontend dependencies...
  call npm install || (
    echo [ERROR] npm install failed.
    popd
    pause
    exit /b 1
  )
) else (
  echo [INFO] Frontend dependencies already installed.
)

set "BACKEND_PID="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%BACKEND_PORT% " ^| findstr LISTENING') do set "BACKEND_PID=%%p"
if not defined BACKEND_PID (
  echo [WARN] Backend is not listening on http://127.0.0.1:%BACKEND_PORT%
  echo [WARN] Please start the backend first if login/API calls fail.
) else (
  echo [INFO] Backend detected on port %BACKEND_PORT% ^(PID: %BACKEND_PID%^)
)

echo [INFO] Frontend URL: http://127.0.0.1:%FRONTEND_PORT%
echo [INFO] API proxy target: http://127.0.0.1:%BACKEND_PORT%

call npm run dev -- --host localhost --port %FRONTEND_PORT%
set "EXIT_CODE=%ERRORLEVEL%"

popd
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Frontend startup failed.
  pause
  exit /b %EXIT_CODE%
)

pause
