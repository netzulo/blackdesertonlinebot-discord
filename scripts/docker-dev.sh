#!/bin/bash
set -e

echo "🔧 Setting up development environment..."

# Copy .env.example to .env if .env doesn't exist
if [ ! -f .env ]; then
    echo "📝 Copying .env.example to .env..."
    cp .env.example .env
    echo "✅ .env file created from .env.example"
    echo "⚠️  Please edit .env and add your Discord bot token before running the bot!"
else
    echo "✅ .env file already exists"
fi

echo "🚀 Starting development environment with docker compose..."
docker compose up --build
