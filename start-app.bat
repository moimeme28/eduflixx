@echo off
REM ============================================================
REM  EduFlix main app startup script
REM  Make sure the MongoDB gateway is running first!
REM ============================================================

cd /d "%~dp0"

echo [start-app] Starting EduFlix dev server...
echo [start-app] Make sure the MongoDB gateway is running (start-gateway.bat)
echo.

bun run dev
