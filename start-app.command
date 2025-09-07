#!/bin/bash

# Navigate to app directory
cd "$(dirname "$0")"

echo "========================================="
echo "Starting James LLM 1"
echo "========================================="

# Kill any existing processes
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Run database migrations
echo "Running database migrations..."
python3 migrate_database.py

# Start backend
echo "Starting backend..."
source .venv/bin/activate
python3 -m backend.app > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Serve frontend
echo "Starting frontend..."
cd frontend
serve -s dist -l 3000 > ../frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 2

echo ""
echo "========================================="
echo "✅ James LLM 1 is running!"
echo "========================================="
echo ""
echo "Opening in browser..."
open http://localhost:3000

echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================="

# Trap Ctrl+C
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Keep running
wait
