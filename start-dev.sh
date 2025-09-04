#!/bin/bash

echo "🚀 Starting CallDocker Development Environment..."
echo

echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo
echo "🗄️  Starting PostgreSQL (if not running)..."
echo "Note: Make sure PostgreSQL is installed and running on port 5432"
echo

echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️   Please edit .env file with your database credentials"
    echo
fi

echo "🚀 Starting development server..."
echo
echo "📍 Server will be available at: http://localhost:3000"
echo "🔐 Admin dashboard: http://localhost:3000/admin"
echo "📞 Agent dashboard: http://localhost:3000/agent"
echo "📊 Health check: http://localhost:3000/health"
echo
echo "Press Ctrl+C to stop the server"
echo

npm run dev
