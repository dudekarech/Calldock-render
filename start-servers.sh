#!/bin/bash

echo "🚀 Starting CallDocker Servers..."
echo

echo "📦 Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo
echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp env.example .env
    echo "⚠️   Please edit .env file with your database credentials"
    echo
fi

echo
echo "🚀 Starting WebSocket server in background..."
nohup node websocket-server.js > websocket.log 2>&1 &
WEBSOCKET_PID=$!

echo "WebSocket server started with PID: $WEBSOCKET_PID"
echo

echo "⏳ Waiting for WebSocket server to start..."
sleep 3

echo
echo "🚀 Starting main Express server..."
echo
echo "📍 Main server will be available at: http://localhost:3000"
echo "🔐 Admin dashboard: http://localhost:3000/admin"
echo "📞 Agent dashboard: http://localhost:3000/agent"
echo "📊 Health check: http://localhost:3000/health"
echo
echo "🔌 WebSocket server running on: ws://localhost:8081"
echo
echo "Press Ctrl+C to stop both servers"
echo

# Function to cleanup on exit
cleanup() {
    echo
    echo "🛑 Shutting down servers..."
    kill $WEBSOCKET_PID 2>/dev/null
    echo "✅ WebSocket server stopped"
    echo "✅ Main server stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Start main server
npm run dev

# Cleanup if we get here
cleanup
