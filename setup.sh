#!/usr/bin/env bash
# ============================================================
#  Tauri Development Setup Script for Debian/Ubuntu
# ============================================================

set -e

echo "Starting Tauri setup for Debian/Ubuntu..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install build dependencies
echo "Installing system packages..."
sudo apt install -y curl git build-essential libssl-dev libgtk-3-dev \
    libayatana-appindicator3-dev librsvg2-dev patchelf \
    libwebkit2gtk-4.1-dev

# Install Node.js (LTS)
echo "Installing Node.js LTS..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# Install Rust
echo "Installing Rust..."
if ! command -v rustc &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# Update Rust
rustup update

# Confirm installation
echo -e "\n Installed versions:"
node -v
npm -v
rustc --version
cargo --version

echo -e "\n Setup complete!"
echo "cd gui"
echo "npm install"
echo "npm run tauri dev"
