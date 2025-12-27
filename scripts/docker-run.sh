#!/bin/bash
set -e

# Get ENV_NAME from environment variable or default to 'env'
ENV_NAME=${ENV_NAME:-env}

echo "🔧 Setting up environment: $ENV_NAME"

if [ "$ENV_NAME" = "prod" ]; then
    # Production mode: require .env file
    echo "🏭 Production mode"
    
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
    
elif [ "$ENV_NAME" = "env" ]; then
    # Development mode: copy .env.example if needed
    echo "🛠️  Development mode"
    
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
    
else
    echo "❌ ERROR: Invalid ENV_NAME value: $ENV_NAME"
    echo "ℹ️  Valid values are: 'env' (development) or 'prod' (production)"
    echo "ℹ️  Usage:"
    echo "   ENV_NAME=env ./scripts/docker-run.sh    # Development"
    echo "   ENV_NAME=prod ./scripts/docker-run.sh   # Production"
    exit 1
fi
