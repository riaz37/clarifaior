#!/bin/bash

echo "🚀 Setting up Clarifaior development environment..."

# Check if required tools are installed
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. You'll need to set up PostgreSQL and Redis manually."
else
    echo "🐳 Starting Docker services..."
    docker-compose up -d
fi

echo "📦 Installing dependencies..."
pnpm install

echo "🗄️  Setting up database..."
cd packages/database
pnpm generate
pnpm push
cd ../..

echo "🔧 Building packages..."
pnpm build

echo "✅ Setup complete! You can now run:"
echo "   pnpm dev    # Start development servers"
echo "   pnpm build  # Build all packages"
echo "   pnpm lint   # Lint code"
echo ""
echo "🌐 Applications will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:4001"
echo "   API Docs: http://localhost:4001/api"