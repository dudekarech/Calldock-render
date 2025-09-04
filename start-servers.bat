@echo off
echo 🚀 Starting CallDocker Servers...
echo.

echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 🔧 Setting up environment...
if not exist .env (
    echo Creating .env file from template...
    copy env.example .env
    echo ⚠️  Please edit .env file with your database credentials
    echo.
)

echo.
echo 🚀 Starting WebSocket server in background...
start "WebSocket Server" cmd /c "node websocket-server.js"

echo.
echo ⏳ Waiting for WebSocket server to start...
timeout /t 3 /nobreak >nul

echo.
echo 🚀 Starting main Express server...
echo.
echo 📍 Main server will be available at: http://localhost:3000
echo 🔐 Admin dashboard: http://localhost:3000/admin
echo 📞 Agent dashboard: http://localhost:3000/agent
echo 📊 Health check: http://localhost:3000/health
echo.
echo 🔌 WebSocket server running on: ws://localhost:8081
echo.
echo Press Ctrl+C to stop the main server
echo (WebSocket server will continue running in background)
echo.

call npm run dev

echo.
echo 🛑 Main server stopped. WebSocket server may still be running.
echo To stop WebSocket server, close the other command window.
pause
