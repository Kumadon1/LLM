#!/bin/bash

echo "🚀 Starting James LLM 1 Desktop App..."
echo "================================="
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down James LLM..."
    pkill -f vite 2>/dev/null
    pkill -f "python.*app.py" 2>/dev/null
    pkill -f "electron.*james-llm" 2>/dev/null
    exit
}

# Set trap for cleanup on script exit
trap cleanup EXIT INT TERM

# Kill any existing processes
echo "🧹 Cleaning up any existing processes..."
pkill -f vite 2>/dev/null
pkill -f "python.*app.py" 2>/dev/null
pkill -f "electron.*james-llm" 2>/dev/null
sleep 1

# Start backend
echo "🔧 Starting backend server..."
cd backend
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
    python app.py &
    BACKEND_PID=$!
else
    echo "❌ Backend virtual environment not found!"
    echo "   Please run: cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi
cd ..

# Start frontend dev server
echo "🎨 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for services to start
echo "⏳ Waiting for services to start..."
for i in {1..10}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend ready"
        break
    fi
    sleep 1
done

for i in {1..10}; do
    # Check both possible ports (5173 and 5174)
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "✅ Frontend ready on port 5173"
        FRONTEND_PORT=5173
        break
    elif curl -s http://localhost:5174 > /dev/null 2>&1; then
        echo "✅ Frontend ready on port 5174"
        FRONTEND_PORT=5174
        break
    fi
    sleep 1
done

# Update Electron to use the correct port
if [ ! -z "$FRONTEND_PORT" ]; then
    # Temporarily update the Electron main.js with the correct port
    sed -i.bak "s/localhost:[0-9]\{4\}/localhost:$FRONTEND_PORT/g" electron/main.js
fi

# Start Electron
echo ""
echo "🚀 Launching James LLM Desktop App..."
echo "   The app window should open shortly."
echo "   Press Ctrl+C to quit."
echo ""
NODE_ENV=development npx electron .

# The cleanup function will handle shutdown
