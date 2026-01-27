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
POSTGRES_STARTED_FILE="/tmp/expense-tracker-postgres-started.flag"
POSTGRES_WAS_RUNNING_FILE="/tmp/expense-tracker-postgres-was-running.flag"
CLEANUP_DONE_FILE="/tmp/expense-tracker-cleanup-done.flag"

# Flag to track if we started PostgreSQL
POSTGRES_STARTED_BY_SCRIPT=false

# Cleanup function
cleanup() {
    # Prevent cleanup from running twice
    if [ -f "$CLEANUP_DONE_FILE" ]; then
        return 0
    fi
    touch "$CLEANUP_DONE_FILE"
    
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    
    # Kill tail processes if they exist
    cleanup_tails
    
    # Stop backend
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat "$BACKEND_PID_FILE")
        echo -e "${BLUE}Stopping backend (PID: $BACKEND_PID)...${NC}"
        if ps -p "$BACKEND_PID" > /dev/null 2>&1; then
            kill "$BACKEND_PID" 2>/dev/null
            echo -e "${GREEN}✓ Backend stopped${NC}"
        else
            echo -e "${YELLOW}Backend process not found (may have already stopped)${NC}"
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    
    # Stop frontend
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        echo -e "${BLUE}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
        if ps -p "$FRONTEND_PID" > /dev/null 2>&1; then
            kill "$FRONTEND_PID" 2>/dev/null
            echo -e "${GREEN}✓ Frontend stopped${NC}"
        else
            echo -e "${YELLOW}Frontend process not found (may have already stopped)${NC}"
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Stop PostgreSQL if it's running
    if check_postgres_running; then
        echo -e "${BLUE}Stopping PostgreSQL...${NC}"
        stop_postgres
    else
        echo -e "${GREEN}✓ PostgreSQL is not running${NC}"
    fi
    rm -f "$POSTGRES_STARTED_FILE" "$POSTGRES_WAS_RUNNING_FILE"
    
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

# Function to check if PostgreSQL is running
check_postgres_running() {
    # Check if port 5432 is listening
    if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    fi
    # Also check if postgres process exists
    if pgrep -x postgres >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Function to stop PostgreSQL
stop_postgres() {
    if ! check_postgres_running; then
        echo -e "${GREEN}✓ PostgreSQL is not running${NC}"
        return 0
    fi
    
    # Try to stop PostgreSQL using Homebrew services
    if command -v brew &> /dev/null; then
        # Try postgresql@15 first
        if brew services list | grep -q "postgresql@15"; then
            echo -e "${BLUE}Stopping PostgreSQL 15 via Homebrew...${NC}"
            brew services stop postgresql@15 2>/dev/null || {
                # Try without @15 suffix
                if brew services list | grep -q "postgresql"; then
                    brew services stop postgresql 2>/dev/null || true
                fi
            }
        elif brew services list | grep -q "postgresql"; then
            echo -e "${BLUE}Stopping PostgreSQL via Homebrew...${NC}"
            brew services stop postgresql 2>/dev/null || true
        else
            # Try direct pg_ctl stop
            if [ -d "/opt/homebrew/var/postgresql@15" ]; then
                /opt/homebrew/bin/pg_ctl -D /opt/homebrew/var/postgresql@15 stop 2>/dev/null || true
            elif [ -d "/usr/local/var/postgresql@15" ]; then
                /usr/local/bin/pg_ctl -D /usr/local/var/postgresql@15 stop 2>/dev/null || true
            fi
        fi
        
        # Wait a moment and verify it stopped
        sleep 2
        if ! check_postgres_running; then
            echo -e "${GREEN}✓ PostgreSQL stopped successfully${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠ PostgreSQL may still be running (could be used by other processes)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}Homebrew not found. Cannot automatically stop PostgreSQL.${NC}"
    fi
}

# Function to start PostgreSQL
start_postgres() {
    echo -e "${BLUE}Checking PostgreSQL status...${NC}"
    
    if check_postgres_running; then
        echo -e "${GREEN}✓ PostgreSQL is already running${NC}"
        # Track that PostgreSQL was running so we can stop it on shutdown
        touch "$POSTGRES_WAS_RUNNING_FILE"
        return 0
    fi
    
    echo -e "${YELLOW}PostgreSQL is not running. Attempting to start...${NC}"
    
    # Try to start PostgreSQL using Homebrew services (most common on macOS)
    if command -v brew &> /dev/null; then
        # Try postgresql@15 first (as user mentioned Postgres 15)
        if brew services list | grep -q "postgresql@15"; then
            echo -e "${BLUE}Starting PostgreSQL 15 via Homebrew...${NC}"
            brew services start postgresql@15 || {
                echo -e "${YELLOW}Failed to start via 'brew services start postgresql@15', trying alternative...${NC}"
                # Try without @15 suffix
                if brew services list | grep -q "postgresql"; then
                    brew services start postgresql || {
                        echo -e "${RED}Failed to start PostgreSQL via Homebrew services${NC}"
                        return 1
                    }
                else
                    echo -e "${RED}PostgreSQL service not found in Homebrew${NC}"
                    return 1
                fi
            }
        elif brew services list | grep -q "postgresql"; then
            echo -e "${BLUE}Starting PostgreSQL via Homebrew...${NC}"
            brew services start postgresql || {
                echo -e "${RED}Failed to start PostgreSQL via Homebrew services${NC}"
                return 1
            }
        else
            echo -e "${YELLOW}PostgreSQL not found in Homebrew services. Trying direct pg_ctl...${NC}"
            # Try to find and start PostgreSQL directly
            if [ -d "/opt/homebrew/var/postgresql@15" ]; then
                /opt/homebrew/bin/pg_ctl -D /opt/homebrew/var/postgresql@15 start || {
                    echo -e "${RED}Failed to start PostgreSQL directly${NC}"
                    return 1
                }
            elif [ -d "/usr/local/var/postgresql@15" ]; then
                /usr/local/bin/pg_ctl -D /usr/local/var/postgresql@15 start || {
                    echo -e "${RED}Failed to start PostgreSQL directly${NC}"
                    return 1
                }
            else
                echo -e "${RED}Could not find PostgreSQL installation${NC}"
                echo -e "${YELLOW}Please start PostgreSQL manually or install it with:${NC}"
                echo -e "${YELLOW}  brew install postgresql@15${NC}"
                echo -e "${YELLOW}  brew services start postgresql@15${NC}"
                return 1
            fi
        fi
        
        # Mark that we started PostgreSQL
        touch "$POSTGRES_STARTED_FILE"
        POSTGRES_STARTED_BY_SCRIPT=true
        
        # Wait for PostgreSQL to start
        echo -e "${BLUE}Waiting for PostgreSQL to start...${NC}"
        for i in {1..30}; do
            sleep 1
            if check_postgres_running; then
                echo -e "${GREEN}✓ PostgreSQL started successfully${NC}"
                return 0
            fi
        done
        
        echo -e "${RED}PostgreSQL failed to start within 30 seconds${NC}"
        rm -f "$POSTGRES_STARTED_FILE"
        return 1
    else
        echo -e "${RED}Homebrew not found. Cannot automatically start PostgreSQL.${NC}"
        echo -e "${YELLOW}Please start PostgreSQL manually before running this script.${NC}"
        return 1
    fi
}

# Clean up any stale cleanup flag from previous runs
rm -f "$CLEANUP_DONE_FILE"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Starting Expense Tracker Development${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Start PostgreSQL if needed
if ! start_postgres; then
    echo -e "${RED}Failed to start PostgreSQL. Please start it manually and try again.${NC}"
    exit 1
fi
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

# Load DATABASE_URL from .env file if it exists
if [ -f ".env" ]; then
    echo -e "${BLUE}Loading DATABASE_URL from .env file...${NC}"
    # Extract DATABASE_URL from .env file (handles comments and empty lines)
    DATABASE_URL_LINE=$(grep -v '^#' .env | grep -v '^$' | grep '^DATABASE_URL=' | head -1)
    if [ ! -z "$DATABASE_URL_LINE" ]; then
        export "$DATABASE_URL_LINE"
        echo -e "${GREEN}✓ DATABASE_URL loaded${NC}"
    fi
fi

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
