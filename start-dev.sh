#!/bin/bash

echo "🚀 Starting James LLM 1 Desktop App..."

# Kill any existing processes
pkill -f "python.*main.py" 2>/dev/null
pkill -f "python.*app.py" 2>/dev/null
pkill -f "electron" 2>/dev/null

# Start backend
echo "Starting backend server..."
cd backend
source .venv/bin/activate
python app.py &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "Waiting for backend..."
sleep 3

# Check if backend is running
curl -s http://localhost:8000/health > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ Backend failed to start"
    exit 1
fi

echo "✅ Backend running on http://localhost:8000"

# Start Electron app
echo "Starting Electron app..."
NODE_ENV=development electron .

# Cleanup on exit
echo "Shutting down..."
kill $BACKEND_PID 2>/dev/null
pkill -f "python.*app.py" 2>/dev/null
