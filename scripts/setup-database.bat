@echo off
chcp 65001 >nul
echo 🚀 Setting up CallDocker Database...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ docker-compose is not installed. Please install it first.
    pause
    exit /b 1
)

REM Create necessary directories
echo 📁 Creating directories...
if not exist "backups" mkdir backups
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads

REM Start database services
echo 🐘 Starting PostgreSQL and Redis...
docker-compose -f docker-compose.db.yml up -d

REM Wait for database to be ready
echo ⏳ Waiting for database to be ready...
timeout /t 10 /nobreak >nul

REM Check database connection
echo 🔍 Testing database connection...
docker exec calldocker-postgres pg_isready -U calldocker_user -d calldocker
if errorlevel 1 (
    echo ❌ Database connection failed. Please check the logs:
    docker-compose -f docker-compose.db.yml logs postgres
    pause
    exit /b 1
)

echo ✅ Database is ready!

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating .env file...
    (
        echo # CallDocker Development Environment
        echo NODE_ENV=development
        echo PORT=3000
        echo HOST=localhost
        echo APP_URL=http://localhost:3000
        echo.
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=calldocker
        echo DB_USER=calldocker_user
        echo DB_PASSWORD=calldocker_password
        echo.
        echo # Authentication & Security
        echo JWT_SECRET=dev_jwt_secret_key_here
        echo SESSION_SECRET=dev_session_secret_here
        echo BCRYPT_ROUNDS=12
        echo.
        echo # Global Admin Settings
        echo GLOBAL_ADMIN_EMAIL=admin@calldocker.com
        echo GLOBAL_ADMIN_PASSWORD=admin123
        echo.
        echo # Rate Limiting
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX_REQUESTS=100
        echo.
        echo # CORS Settings
        echo CORS_ORIGIN=http://localhost:3000
    ) > .env
    echo ✅ .env file created!
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

echo.
echo 🎉 Database setup complete!
echo.
echo 📊 Database Access:
echo    - PostgreSQL: localhost:5432
echo    - Username: calldocker_user
echo    - Password: calldocker_password
echo    - Database: calldocker
echo.
echo 🔧 pgAdmin: http://localhost:5050
echo    - Email: admin@calldocker.com
echo    - Password: admin123
echo.
echo 📱 Redis: localhost:6379
echo.
echo 🚀 Next steps:
echo    1. Start the application: npm start
echo    2. Test company registration: http://localhost:3000/company-registration
echo    3. Access admin dashboard: http://localhost:3000/admin
echo.
echo 💡 To stop database services: docker-compose -f docker-compose.db.yml down
echo 💡 To view logs: docker-compose -f docker-compose.db.yml logs -f
echo.
pause

