#!/bin/bash

# Get the directory this script lives in, regardless of where it's launched from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "    BU Schedule Builder"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Start Spring Boot backend ─────────────────────────────────────────────────
echo "[1/3] Starting Spring Boot backend..."
cd "$SCRIPT_DIR/class-data-backend"
mvn spring-boot:run &
BACKEND_PID=$!

# ── Wait for Spring Boot to be ready ─────────────────────────────────────────
echo "[2/3] Waiting for backend to start (this may take 15-30 seconds)..."
until curl -s http://localhost:8080/api/health > /dev/null 2>&1; do
    sleep 2
    printf "."
done
echo ""
echo "      Backend is ready!"
echo ""

# ── Start React frontend ──────────────────────────────────────────────────────
echo "[3/3] Starting frontend..."
cd "$SCRIPT_DIR"
npm start &
FRONTEND_PID=$!

echo ""
echo "BU Schedule Builder is running."
echo "  - Backend:  http://localhost:8080"
echo "  - Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to shut down."
echo ""

# ── Cleanup on Ctrl+C ─────────────────────────────────────────────────────────
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; pkill -f 'spring-boot' 2>/dev/null; exit 0" SIGINT SIGTERM

# Keep script alive so Ctrl+C works
wait
