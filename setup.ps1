# ============================================================
#  Tauri Development Setup Script for Windows 11
# ============================================================

Write-Host "Starting Tauri setup for Windows..." -ForegroundColor Cyan

# Update everything
winget upgrade --all

# Install dependencies
Write-Host "Installing Node.js LTS..."
winget install -e --id OpenJS.NodeJS.LTS -h --accept-package-agreements --accept-source-agreements

Write-Host "Installing Rust..."
winget install -e --id Rustlang.Rustup -h --accept-package-agreements --accept-source-agreements

Write-Host "Installing Visual Studio Build Tools..."
winget install -e --id Microsoft.VisualStudio.2022.BuildTools -h --accept-package-agreements --accept-source-agreements

Write-Host "Installing WebView2 Runtime..."
winget install -e --id Microsoft.EdgeWebView2Runtime -h --accept-package-agreements --accept-source-agreements

# Configure Rust
Write-Host "Updating Rust toolchain..."
rustup update
rustup target add x86_64-pc-windows-msvc

# Confirm installation
Write-Host "`nInstalled versions:"
node -v
npm -v
rustc --version
cargo --version

Write-Host "`nTauri setup completed successfully!" -ForegroundColor Green
Write-Host "cd gui"
Write-Host "npm install"
Write-Host "npm run tauri dev"