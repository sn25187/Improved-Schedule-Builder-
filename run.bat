@echo off
title BU Schedule Builder

echo Starting BU Schedule Builder...
echo.

:: ── Start Spring Boot backend ────────────────────────────────────────────────
echo [1/3] Starting Spring Boot backend...
cd /d "%~dp0class-data-backend"
start "Spring Boot" cmd /c "mvn spring-boot:run"

:: ── Wait for Spring Boot to be ready ─────────────────────────────────────────
echo [2/3] Waiting for backend to start (this may take 15-30 seconds)...
:WAIT_LOOP
timeout /t 2 /nobreak >nul
curl -s http://localhost:8080/api/health >nul 2>&1
if %errorlevel% neq 0 (
    goto WAIT_LOOP
)
echo       Backend is ready!
echo.

:: ── Start React frontend ──────────────────────────────────────────────────────
echo [3/3] Starting frontend...
cd /d "%~dp0"
start "React Frontend" cmd /c "npm start"

echo.
echo BU Schedule Builder is running.
echo  - Backend:  http://localhost:8080
echo  - Frontend: http://localhost:3000
echo.
echo Close this window to shut down the application.
echo.
pause

:: ── Cleanup on exit ───────────────────────────────────────────────────────────
echo Shutting down...
taskkill /fi "windowtitle eq Spring Boot" /f >nul 2>&1
taskkill /fi "windowtitle eq React Frontend" /f >nul 2>&1