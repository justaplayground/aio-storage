#!/bin/bash

# Admin Creation Script Wrapper
# This script provides an easy way to create the first admin user

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🔐 AIO Storage - Admin Creation Script${NC}"
echo -e "${BLUE}=====================================${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if ts-node is available
if ! command -v ts-node &> /dev/null; then
    echo -e "${YELLOW}⚠️  ts-node not found. Installing ts-node globally...${NC}"
    npm install -g ts-node
fi

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${RED}❌ This script must be run from the project root directory.${NC}"
    echo -e "${RED}   Current directory: $(pwd)${NC}"
    echo -e "${RED}   Expected directory: $PROJECT_ROOT${NC}"
    exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Dependencies not installed. Installing...${NC}"
    npm install
fi

# Check if MongoDB is running (optional check)
if ! nc -z localhost 27017 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: MongoDB doesn't seem to be running on localhost:27017${NC}"
    echo -e "${YELLOW}   Make sure MongoDB is started before creating the admin user.${NC}\n"
fi

echo -e "${GREEN}✅ Environment check passed. Starting admin creation...${NC}\n"

# Run the TypeScript script
exec ts-node "$SCRIPT_DIR/create-admin.ts" "$@"
