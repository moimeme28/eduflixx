@echo off
REM ============================================================
REM  EduFlix MongoDB Gateway startup script
REM  Run this in a terminal BEFORE starting the main app.
REM ============================================================

cd /d "%~dp0"

REM --- MongoDB Atlas connection ---
set "MONGODB_URI=mongodb+srv://derricktakyi399_db_user:Eduflix2026@eduflix.trvzmbn.mongodb.net/?appName=eduflix"
set "MONGODB_DB=eduflix"

REM --- Shared secret between the app and this gateway ---
set "MONGO_API_KEY=eduflix-local-secret-2026"

REM --- Port the gateway listens on ---
set "PORT=8787"

echo [start-gateway] Starting MongoDB API gateway on port 8787...
echo [start-gateway] Database: eduflix
echo [start-gateway] Atlas cluster: eduflix.trvzmbn.mongodb.net
echo.

npm start
