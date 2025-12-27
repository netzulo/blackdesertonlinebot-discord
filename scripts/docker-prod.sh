#!/bin/bash
set -e

echo "🔧 Preparing production environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "❌ Production requires a .env file with actual credentials."
    echo "ℹ️  Please create .env file with your Discord bot token."
    echo "ℹ️  You can use .env.example as a template:"
    echo "   cp .env.example .env"
    echo "   # Then edit .env with your actual credentials"
    exit 1
fi

echo "✅ .env file found"
echo "🚀 Starting production environment with docker compose..."
docker compose -f docker-compose.prod.yml up --build -d
