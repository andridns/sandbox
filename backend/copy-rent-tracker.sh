#!/bin/bash
# Script to copy rent-tracker directory into backend for Docker build
# This ensures the JSON file is available during production deployment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RENT_TRACKER_SOURCE="$PROJECT_ROOT/rent-tracker"
RENT_TRACKER_DEST="$SCRIPT_DIR/rent-tracker"

if [ -d "$RENT_TRACKER_SOURCE" ]; then
    echo "Copying rent-tracker directory to backend/rent-tracker..."
    cp -r "$RENT_TRACKER_SOURCE" "$RENT_TRACKER_DEST"
    echo "✓ Rent-tracker directory copied successfully"
else
    echo "Warning: rent-tracker directory not found at $RENT_TRACKER_SOURCE"
    echo "Rent expense import may be skipped during deployment"
fi
