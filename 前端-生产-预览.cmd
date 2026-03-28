@echo off
setlocal
chcp 65001 >nul

set "ROOT=%~dp0"
set "FRONTEND_DIR=%ROOT%frontend"
set "FRONTEND_PORT=63000"
set "BACKEND_PORT=63002"

echo [INFO] Project root: %ROOT%
echo [INFO] Mode: production preview ^(build + vite preview^)

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

echo [INFO] Building frontend assets...
call npm run build || (
  echo [ERROR] Frontend build failed.
  popd
  pause
  exit /b 1
)

echo [INFO] Preview URL: http://localhost:%FRONTEND_PORT%
echo [INFO] Backend expected at: http://127.0.0.1:%BACKEND_PORT%
call npm run start:prod
set "EXIT_CODE=%ERRORLEVEL%"

popd
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Frontend production preview failed.
  pause
  exit /b %EXIT_CODE%
)

pause
