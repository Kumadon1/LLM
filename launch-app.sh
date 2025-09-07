#!/bin/bash

echo "========================================="
echo "Launching James LLM 1"
echo "========================================="

# Kill any existing processes
echo "Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Start backend
echo "Starting backend API..."
cd /Users/james/james-llm-1
source .venv/bin/activate
python3 -m backend.app &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Check backend
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo "✓ Backend running at: http://localhost:8000"
else
    echo "⚠ Backend may not be ready yet"
fi

# Serve frontend
echo "Starting frontend..."
cd frontend

# Use npx to run serve without global install
npx serve -s dist -l 3000 &
FRONTEND_PID=$!

sleep 2

echo ""
echo "========================================="
echo "✅ Application is running!"
echo "========================================="
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================="

# Trap Ctrl+C
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Keep running
wait
