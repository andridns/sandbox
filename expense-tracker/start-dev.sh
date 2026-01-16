#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# PID files
BACKEND_PID_FILE="/tmp/expense-tracker-backend.pid"
FRONTEND_PID_FILE="/tmp/expense-tracker-frontend.pid"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    
    # Kill tail processes if they exist
    cleanup_tails
    
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
            echo -e "${BLUE}Stopping backend (PID: $BACKEND_PID)...${NC}"
            kill "$BACKEND_PID" 2>/dev/null
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
            echo -e "${BLUE}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
            kill "$FRONTEND_PID" 2>/dev/null
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Kill any remaining processes
    pkill -f "uvicorn app.main:app" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    
    echo -e "${GREEN}Cleanup complete.${NC}"
    exit 0
}

# Cleanup function for tail processes
cleanup_tails() {
    if [ ! -z "$TAIL_BACKEND_PID" ]; then
        kill "$TAIL_BACKEND_PID" 2>/dev/null
    fi
    if [ ! -z "$TAIL_FRONTEND_PID" ]; then
        kill "$TAIL_FRONTEND_PID" 2>/dev/null
    fi
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM EXIT

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

# Check if Poetry is installed (for backend)
if ! command -v poetry &> /dev/null; then
    echo -e "${RED}Error: Poetry is not installed. Please install it first.${NC}"
    echo -e "${YELLOW}Install with: curl -sSL https://install.python-poetry.org | python3 -${NC}"
    exit 1
fi

# Check if Node.js is installed (for frontend)
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if npm is installed (for frontend)
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Starting Expense Tracker Development${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check backend dependencies
echo -e "${BLUE}Checking backend dependencies...${NC}"
cd "$BACKEND_DIR"
if [ ! -d ".venv" ] && [ ! -f "poetry.lock" ]; then
    echo -e "${YELLOW}Backend dependencies not installed. Installing...${NC}"
    poetry install || {
        echo -e "${RED}Failed to install backend dependencies${NC}"
        exit 1
    }
fi

# Check frontend dependencies
echo -e "${BLUE}Checking frontend dependencies...${NC}"
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Frontend dependencies not installed. Installing...${NC}"
    npm install || {
        echo -e "${RED}Failed to install frontend dependencies${NC}"
        exit 1
    }
fi

# Start backend
echo -e "${BLUE}Starting backend server on http://localhost:8000...${NC}"
cd "$BACKEND_DIR"
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/expense-tracker-backend.log 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$BACKEND_PID_FILE"

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ! ps -p "$BACKEND_PID" > /dev/null 2>&1; then
    echo -e "${RED}Backend failed to start. Check logs:${NC}"
    cat /tmp/expense-tracker-backend.log
    exit 1
fi

echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

# Start frontend
echo -e "${BLUE}Starting frontend server on http://localhost:5173...${NC}"
cd "$FRONTEND_DIR"
npm run dev > /tmp/expense-tracker-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"

# Wait a moment for frontend to start
sleep 2

# Check if frontend started successfully
if ! ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
    echo -e "${RED}Frontend failed to start. Check logs:${NC}"
    cat /tmp/expense-tracker-frontend.log
    cleanup
    exit 1
fi

echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Services are running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Backend:  http://localhost:8000${NC}"
echo -e "${BLUE}Frontend: http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Show logs in real-time
echo -e "${BLUE}=== Logs (Backend & Frontend) ===${NC}"
echo -e "${YELLOW}Note: Logs are being written to:${NC}"
echo -e "  Backend:  /tmp/expense-tracker-backend.log"
echo -e "  Frontend: /tmp/expense-tracker-frontend.log"
echo ""

# Use multitail if available, otherwise show backend logs by default
if command -v multitail &> /dev/null; then
    multitail -s 2 /tmp/expense-tracker-backend.log /tmp/expense-tracker-frontend.log
else
    # Simple approach: show backend logs, user can check frontend logs separately
    echo -e "${BLUE}Showing backend logs (use 'tail -f /tmp/expense-tracker-frontend.log' in another terminal for frontend logs)${NC}"
    tail -f /tmp/expense-tracker-backend.log
fi
