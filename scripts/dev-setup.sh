#!/bin/bash

echo "🔧 Setting up development environment..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js is installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Copy .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    
    # Update environment variables for local development
    sed -i.bak 's/mongodb:27017/localhost:27017/g' .env
    sed -i.bak 's/redis:6379/localhost:6379/g' .env
    sed -i.bak 's/rabbitmq:5672/localhost:5672/g' .env
    rm .env.bak
    
    echo "✅ .env file created and configured for local development"
else
    echo "⚠️  .env file already exists, skipping..."
fi

echo ""

# Start only infrastructure services
echo "🐳 Starting infrastructure services (MongoDB, Redis, RabbitMQ)..."
docker-compose up -d mongodb redis rabbitmq

if [ $? -ne 0 ]; then
    echo "❌ Failed to start infrastructure services"
    exit 1
fi

echo "✅ Infrastructure services started"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "✅ Development environment ready!"
echo ""
echo "🚀 Start development servers:"
echo "   npm run dev"
echo ""
echo "📍 Access your applications:"
echo "   - Web Dashboard: http://localhost:3000"
echo "   - API Server: http://localhost:4000"
echo "   - RabbitMQ Management: http://localhost:15672 (admin/password123)"
echo ""
echo "🛑 To stop infrastructure:"
echo "   docker-compose stop mongodb redis rabbitmq"
echo ""

