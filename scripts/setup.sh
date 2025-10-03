#!/bin/bash

echo "🚀 Setting up AIO Storage..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ All prerequisites are installed"
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
    echo "✅ .env file created"
else
    echo "⚠️  .env file already exists, skipping..."
fi

echo ""

# Build Docker images
echo "🐳 Building Docker images..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build Docker images"
    exit 1
fi

echo "✅ Docker images built successfully"
echo ""

# Start Docker containers
echo "🚀 Starting Docker containers..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start Docker containers"
    exit 1
fi

echo "✅ Docker containers started"
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking services..."
docker-compose ps

echo ""
echo "✅ Setup complete!"
echo ""
echo "📍 Access your applications:"
echo "   - Web Dashboard: http://localhost:3000"
echo "   - API Server: http://localhost:4000"
echo "   - RabbitMQ Management: http://localhost:15672 (admin/password123)"
echo ""
echo "📚 Next steps:"
echo "   - Visit http://localhost:3000 to create an account"
echo "   - Check logs: npm run docker:logs"
echo "   - Stop services: npm run docker:down"
echo ""

