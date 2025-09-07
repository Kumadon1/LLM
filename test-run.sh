#!/bin/bash

echo "Starting James LLM 1 - Test Run"
echo "================================"

# Kill any existing processes on the ports
echo "Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start backend
echo "Starting backend..."
cd /Users/james/james-llm-1
source .venv/bin/activate
python3 -m backend.app > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
for i in {1..10}; do
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        echo "✓ Backend is running"
        break
    fi
    sleep 1
done

# Check if backend started successfully
if ! curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo "❌ Backend failed to start. Check backend.log for errors:"
    tail -20 backend.log
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 3

echo ""
echo "================================"
echo "✓ Services are running:"
echo "  Backend:  http://localhost:8000 (PID: $BACKEND_PID)"
echo "  Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Logs:"
echo "  Backend:  backend.log"
echo "  Frontend: frontend.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo "================================"

# Trap Ctrl+C and cleanup
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Keep script running
wait
