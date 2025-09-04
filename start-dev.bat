@echo off
echo 🚀 Starting CallDocker Development Environment...
echo.

echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 🗄️  Starting PostgreSQL (if not running)...
echo Note: Make sure PostgreSQL is installed and running on port 5432
echo.

echo 🔧 Setting up environment...
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please edit .env file with your database credentials
    echo.
)

echo 🚀 Starting development server...
echo.
echo 📍 Server will be available at: http://localhost:3000
echo 🔐 Admin dashboard: http://localhost:3000/admin
echo 📞 Agent dashboard: http://localhost:3000/agent
echo 📊 Health check: http://localhost:3000/health
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev

pause
