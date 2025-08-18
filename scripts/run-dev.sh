#!/bin/bash

# Advanced MTR Development Script
# Starts the development environment with Vite and Electron

set -e  # Exit on any error

echo "Starting Advanced MTR development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

# Check if we are in the right directory
if [ ! -f "package.json" ]; then
    print_error "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Stop existing processes
print_status "Stopping any existing processes..."
pkill -f "vite\|electron" 2>/dev/null || true

# Build Electron files
print_status "Building Electron files..."
if node build.js; then
    print_success "Electron files built successfully"
else
    print_error "Failed to build Electron files"
    exit 1
fi

# Starte Vite Development Server
print_status "Starting Vite development server..."
npx vite &
VITE_PID=$!

# Wait until Vite is started
sleep 3

# Check if Vite is running
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    print_warning "Vite server might not be ready yet, waiting a bit more..."
    sleep 2
fi

# Start Electron
print_status "Starting Electron..."
NODE_ENV=development npx electron . &
ELECTRON_PID=$!

# Cleanup function on exit
cleanup() {
    print_status "\nShutting down..."
    kill $VITE_PID 2>/dev/null || true
    kill $ELECTRON_PID 2>/dev/null || true
    pkill -f "vite\|electron" 2>/dev/null || true
    exit 0
}

# Setup signal handler
trap cleanup SIGINT SIGTERM

print_success "Development environment started successfully!"
print_status "Electron app should open automatically"
print_status "Vite development server running on http://localhost:5173"
print_status "Hot reload is enabled - changes will be reflected automatically"
print_status ""
print_status "Press Ctrl+C to stop the development environment"

# Wait for processes
wait
