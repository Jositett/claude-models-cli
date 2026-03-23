#!/usr/bin/env bash
# Claude Models CLI - Unix/Linux/macOS Installation Script
# Usage: curl -fsSL https://raw.githubusercontent.com/Jositett/claude-models-cli/main/install.sh | bash

set -e

echo "🚀 Installing Claude Models CLI..."

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed!"
    echo "Please install Bun first: https://bun.sh"
    echo "Or use: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun detected: $(bun --version)"

REPO_URL="https://github.com/Jositett/claude-models-cli"
CONFIG_DIR="$HOME/.claude-models-cli"
INSTALL_DIR="${CLAUDE_MODELS_INSTALL_DIR:-$HOME/.claude-models-cli-repo}"

# Clone repository if not exists
if [ -d "$INSTALL_DIR" ]; then
    echo "📁 Repository already exists, updating..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "📥 Cloning repository..."
    git clone "$REPO_URL" "$INSTALL_DIR"
fi

# Build the project
cd "$INSTALL_DIR"
echo "🔨 Building project..."
bun install
bun run build

# Create symlink in ~/.local/bin or /usr/local/bin
BIN_DIR="${CLAUDE_MODELS_BIN_DIR:-$HOME/.local/bin}"
if [ -w "/usr/local/bin" ]; then
    BIN_DIR="/usr/local/bin"
fi

mkdir -p "$BIN_DIR"

# Create wrapper script
cat > "$BIN_DIR/cm" << 'EOF'
#!/usr/bin/env bash
bun "$HOME/.claude-models-cli-repo/dist/cli.js" "$@"
EOF

chmod +x "$BIN_DIR/cm"

# Check if BIN_DIR is in PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo "⚠️  $BIN_DIR is not in your PATH"
    echo "Add this to your ~/.bashrc, ~/.zshrc, or ~/.config/fish/config.fish:"
    echo ""
    echo "  export PATH=\"$BIN_DIR:\$PATH\""
    echo ""
    echo "Or add to shell config now? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        SHELL_RC="${HOME}/.bashrc"
        if [ -n "${ZSH_VERSION}" ]; then
            SHELL_RC="${HOME}/.zshrc"
        elif [ -n "${FISH_VERSION}" ]; then
            SHELL_RC="${HOME}/.config/fish/config.fish"
        fi

        if [ -f "$SHELL_RC" ]; then
            echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$SHELL_RC"
            echo "✅ Added to $SHELL_RC"
            echo "Restart your terminal or run: source $SHELL_RC"
        fi
    fi
fi

# Setup config directory
mkdir -p "$CONFIG_DIR"

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Restart your terminal or source your shell config"
echo "2. Set your API key:"
echo "   export OPENROUTER_API_KEY='sk-or-v1-...'"
echo "3. Fetch models:"
echo "   cm update"
echo "4. Generate aliases:"
echo "   cm export"
echo "   source ~/.claude-models-cli/aliases.sh"
echo ""
echo "📖 See README.md for full documentation"
