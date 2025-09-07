#!/bin/bash

echo "========================================="
echo "Serving James LLM 1 Frontend Bundle"
echo "========================================="

cd /Users/james/james-llm-1/frontend

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "Error: dist folder not found. Run 'npm run build' first."
    exit 1
fi

# Check if serve is installed
if ! command -v serve &> /dev/null; then
    echo "Installing 'serve' package..."
    npm install -g serve
fi

echo "Starting static server..."
echo "Frontend will be available at: http://localhost:3000"
echo ""

# Serve the dist folder
serve -s dist -l 3000
