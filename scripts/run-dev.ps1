# Advanced MTR Development Script for Windows
# Starts the development environment with Vite and Electron

# Stop on any error
$ErrorActionPreference = "Stop"

Write-Host "Starting Advanced MTR development environment..." -ForegroundColor Blue

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host $Message -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor $Green
}

function Write-Error {
    param([string]$Message)
    Write-Host $Message -ForegroundColor $Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host $Message -ForegroundColor $Yellow
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "Error: package.json not found. Please run this script from the project root."
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Status "Node.js version: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed. Please install Node.js first."
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Status "npm version: $npmVersion"
} catch {
    Write-Error "npm is not installed. Please install npm first."
    exit 1
}

# Stop existing processes
Write-Status "Stopping any existing processes..."
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
} catch {
    Write-Warning "No existing processes to stop or error stopping them"
}

# Build Electron files
Write-Status "Building Electron files..."
try {
    node build.js
    Write-Success "Electron files built successfully"
} catch {
    Write-Error "Failed to build Electron files"
    exit 1
}

# Start Vite Development Server
Write-Status "Starting Vite development server..."
$viteJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npx vite
}

# Wait for Vite to start
Start-Sleep -Seconds 3

# Check if Vite is running
$maxAttempts = 5
$attempt = 0
$viteReady = $false

while ($attempt -lt $maxAttempts -and -not $viteReady) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $viteReady = $true
        }
    } catch {
        $attempt++
        if ($attempt -lt $maxAttempts) {
            Write-Warning "Vite server might not be ready yet, waiting a bit more... (Attempt $attempt/$maxAttempts)"
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $viteReady) {
    Write-Warning "Vite server might not be ready, but continuing..."
}

# Start Electron
Write-Status "Starting Electron..."
$env:NODE_ENV = "development"
$electronJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:NODE_ENV = "development"
    npx electron .
}

# Cleanup function
function Cleanup {
    Write-Status "`nShutting down..."
    
    if ($viteJob) {
        Stop-Job $viteJob -ErrorAction SilentlyContinue
        Remove-Job $viteJob -ErrorAction SilentlyContinue
    }
    
    if ($electronJob) {
        Stop-Job $electronJob -ErrorAction SilentlyContinue
        Remove-Job $electronJob -ErrorAction SilentlyContinue
    }
    
    # Stop any remaining node/electron processes
    try {
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
        Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    } catch {
        # Ignore errors when stopping processes
    }
    
    exit 0
}

# Set up signal handlers
$null = Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

Write-Success "Development environment started successfully!"
Write-Status "Electron app should open automatically"
Write-Status "Vite development server running on http://localhost:5173"
Write-Status "Hot reload is enabled - changes will be reflected automatically"
Write-Status ""
Write-Status "Press Ctrl+C to stop the development environment"

# Wait for user to press Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if jobs are still running
        if ($viteJob.State -eq "Failed" -or $electronJob.State -eq "Failed") {
            Write-Error "One of the background jobs failed"
            Cleanup
        }
    }
} catch {
    Cleanup
}
