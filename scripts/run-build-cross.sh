#!/bin/bash

# Advanced MTR Cross-Platform Build Script
# Creates Electron binaries for Windows, Linux and macOS from macOS

set -e  # Exit on any error

echo "Building IP Scanner for all platforms (Cross-Compilation from macOS)..."

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

# Check if we are on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_warning "Cross-compilation works best on macOS. You're running on: $OSTYPE"
fi

# Create release directory
print_status "Creating release directory..."
mkdir -p release

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist dist-electron release/*

# Install dependencies if needed
print_status "Checking dependencies..."
npm install

# Build Vue.js application
print_status "Building Vue.js application..."
if npx vite build; then
    print_success "Vue.js build completed"
else
    print_error "Vue.js build failed"
    exit 1
fi

# Build Electron files
print_status "Building Electron files..."
if node build.js; then
    print_success "Electron build completed"
else
    print_error "Electron build failed"
    exit 1
fi

# Disable code signing completely
export CSC_IDENTITY_AUTO_DISCOVERY=false

# Build for all platforms with cross-compilation
print_status "Building for all platforms (Cross-Compilation)..."

# macOS Builds (native)
print_status "Building for macOS (x64, arm64)..."
if npx electron-builder --mac; then
    print_success "macOS builds completed"
else
    print_error "macOS builds failed"
    exit 1
fi

# Windows Builds (cross-compilation)
print_status "Building for Windows (x64, arm64)..."
if npx electron-builder --win; then
    print_success "Windows builds completed"
else
    print_error "Windows builds failed"
    exit 1
fi

# Linux Builds (cross-compilation)
#print_status "Building for Linux (x64)..."
#if npx electron-builder --linux; then
#    print_success "Linux builds completed"
#else
#    print_error "Linux builds failed"
#    exit 1
#fi

# Move builds to release directory
print_status "Moving builds to release directory..."
if [ -d "dist" ]; then
    cp -r dist/* release/ 2>/dev/null || true
fi

# List created files
print_status "Created files:"
if [ -d "release" ]; then
    find release -type f \( -name "*.zip" -o -name "*.exe" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" \) | while read file; do
        print_success "  $(basename "$file")"
    done
fi

# Clean up release directory - keep only final release files (.zip and .exe)
print_status "Cleaning up release directory..."
if [ -d "release" ]; then
    # Remove all directories in release/
    find release -maxdepth 1 -type d ! -name "release" -exec rm -rf {} + 2>/dev/null || true
    
    # Remove all files that are not final release files
    find release -maxdepth 1 -type f ! \( -name "*.zip" -o -name "*.dmg" -o -name "*.exe" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" \) -exec rm -f {} + 2>/dev/null || true
fi


print_success "Cross-platform build process completed!"
print_status "Check the 'release' directory for your builds"
print_status ""
print_status "Available platforms:"
print_status "  macOS: .zip files (x64, arm64)"
print_status "  Windows: .zip files (x64, arm64)"
#print_status "  Linux: .AppImage, .deb, .rpm files (x64)"
print_status ""
print_warning "Note: Cross-compiled builds may require additional testing on target platforms"
