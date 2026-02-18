$NODE_PATH = "c:\Users\Administrator\node-portable\node-v22.14.0-win-x64"
$env:PATH = "$NODE_PATH;" + $env:PATH
Write-Host "Using Node.js from $NODE_PATH"

Set-Location "c:\Users\Administrator\K-Zodi\kzodi"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}

Write-Host "Starting development server..."
npm run dev
