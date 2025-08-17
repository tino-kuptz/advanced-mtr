#!/bin/bash

# IP Scanner Cross-Platform Build Script
# Erstellt Electron-Binaries für Windows, Linux und macOS von macOS aus

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

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -f "package.json" ]; then
    print_error "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Prüfe ob Node.js installiert ist
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Prüfe ob npm installiert ist
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Prüfe ob wir auf macOS sind
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_warning "Cross-compilation works best on macOS. You're running on: $OSTYPE"
fi

# Erstelle Release-Verzeichnis
print_status "Creating release directory..."
mkdir -p release

# Lösche vorherige Builds
print_status "Cleaning previous builds..."
rm -rf dist dist-electron release/*

# Installiere Dependencies falls nötig
print_status "Checking dependencies..."
npm install

# Baue Vue.js Anwendung
print_status "Building Vue.js application..."
if npx vite build; then
    print_success "Vue.js build completed"
else
    print_error "Vue.js build failed"
    exit 1
fi

# Baue Electron-Dateien
print_status "Building Electron files..."
if node build.js; then
    print_success "Electron build completed"
else
    print_error "Electron build failed"
    exit 1
fi

# Deaktiviere Code Signing komplett
export CSC_IDENTITY_AUTO_DISCOVERY=false

# Baue für alle Plattformen mit Cross-Compilation
print_status "Building for all platforms (Cross-Compilation)..."

# macOS Builds (native)
print_status "Building for macOS (x64, arm64)..."
if npm run dist -- --mac; then
    print_success "macOS builds completed"
else
    print_error "macOS builds failed"
    exit 1
fi

# Windows Builds (cross-compilation)
print_status "Building for Windows (x64, arm64)..."
if npm run dist -- --win; then
    print_success "Windows builds completed"
else
    print_error "Windows builds failed"
    exit 1
fi

# Linux Builds (cross-compilation)
print_status "Building for Linux (x64)..."
if npm run dist -- --linux; then
    print_success "Linux builds completed"
else
    print_error "Linux builds failed"
    exit 1
fi

# Verschiebe Builds ins Release-Verzeichnis
print_status "Moving builds to release directory..."
if [ -d "dist" ]; then
    cp -r dist/* release/ 2>/dev/null || true
fi

# Liste erstellte Dateien
print_status "Created files:"
if [ -d "release" ]; then
    find release -type f \( -name "*.dmg" -o -name "*.exe" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" \) | while read file; do
        print_success "  $(basename "$file")"
    done
fi

print_success "Cross-platform build process completed!"
print_status "Check the 'release' directory for your builds"
print_status ""
print_status "Available platforms:"
print_status "  macOS: .dmg files (x64, arm64)"
print_status "  Windows: .exe files (x64, arm64)"
print_status "  Linux: .AppImage, .deb, .rpm files (x64)"
print_status ""
print_warning "Note: Cross-compiled builds may require additional testing on target platforms"
