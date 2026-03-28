@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

set "ROOT=%~dp0"
echo [WARN] Legacy script name detected: 后端-启动-完整版.cmd
echo [WARN] Current repository no longer distinguishes "完整版".
echo [WARN] Redirecting to explicit production launcher...
call "%ROOT%后端-生产-启动.cmd" %*
