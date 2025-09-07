#!/bin/bash
cd "$(dirname "$0")"

# Kill any old instances
pkill -f "electron.*james-llm" 2>/dev/null

# Start backend (it's needed for functionality)
cd backend
source .venv/bin/activate
python app.py &
BACKEND_PID=$!
cd ..

# Launch Electron with built frontend (no dev server needed!)
npx electron .

# Cleanup when app closes
kill $BACKEND_PID 2>/dev/null
pkill -f "python.*app.py" 2>/dev/null
