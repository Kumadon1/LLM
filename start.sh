#!/bin/bash

# Activate virtual environment
source .venv/bin/activate

# Run database migrations
echo "Checking database migrations..."
python3 migrate_database.py

# Start backend in background
echo "Starting backend server..."
python3 -m backend.app &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend dev server
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo "Application is running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop..."

# Wait for Ctrl+C
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
