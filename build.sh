#!/bin/bash

echo "========================================="
echo "James LLM 1 - Production Build"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo -e "${YELLOW}Step 1: Checking environment...${NC}"
# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo -e "${GREEN}✓ Environment check passed${NC}"

echo -e "${YELLOW}Step 2: Setting up Python virtual environment...${NC}"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r backend/requirements.txt
echo -e "${GREEN}✓ Python dependencies installed${NC}"

echo -e "${YELLOW}Step 3: Running database migrations...${NC}"
python3 migrate_database.py
echo -e "${GREEN}✓ Database ready${NC}"

echo -e "${YELLOW}Step 4: Building frontend...${NC}"
cd frontend

# Clean previous builds
rm -rf dist
rm -rf node_modules/.vite

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Build for production
NODE_ENV=production npm run build

# Check if build was successful
if [ -d "dist" ]; then
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
    
    # Show build stats
    echo ""
    echo "Build Statistics:"
    echo "-----------------"
    TOTAL_SIZE=$(du -sh dist/ | cut -f1)
    echo "Total build size: $TOTAL_SIZE"
    echo ""
    echo "Assets:"
    ls -lah dist/assets/ | grep -E '\.(js|css)$' | awk '{print $9 " - " $5}'
    
    # Calculate gzipped sizes
    echo ""
    echo "Gzipped sizes:"
    for file in dist/assets/*.js; do
        if [ -f "$file" ]; then
            GZIPPED=$(gzip -c "$file" | wc -c | awk '{print int($1/1024) "KB"}')
            FILENAME=$(basename "$file")
            echo "$FILENAME (gzipped): $GZIPPED"
        fi
    done
else
    echo "Build failed!"
    exit 1
fi

cd ..

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Start the backend: source .venv/bin/activate && python3 -m backend.app"
echo "2. Serve the frontend: cd frontend && npx serve dist -p 5173"
echo "   Or use the development server: npm run dev"
echo ""
echo "For development, use: ./start.sh"
