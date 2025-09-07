#!/bin/bash

# Simple, no-drama launcher for James LLM

echo "🚀 Starting James LLM..."

# Go to app directory
cd "$(dirname "$0")"

# Kill everything first to start clean
pkill -f vite 2>/dev/null
pkill -f "python.*app.py" 2>/dev/null
pkill -f electron 2>/dev/null
sleep 2

# Start backend
echo "Starting backend..."
cd backend
source .venv/bin/activate
python app.py &
cd ..

# Start frontend on a fixed port
echo "Starting frontend..."
cd frontend
PORT=5173 npm run dev &
cd ..

# Give servers time to start
echo "Waiting for servers..."
sleep 5

# Launch Electron
echo "Launching app..."
NODE_ENV=development npx electron .

# When app closes, kill everything
pkill -f vite
pkill -f "python.*app.py"
