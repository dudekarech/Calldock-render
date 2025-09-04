@echo off
REM CallDocker Development Startup Script for Windows

echo 🚀 Starting CallDocker Development Environment...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env
    echo ✅ .env file created. Please review and update configuration if needed.
)

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist docker\postgres mkdir docker\postgres
if not exist docker\nginx mkdir docker\nginx
if not exist docker\prometheus mkdir docker\prometheus
if not exist docker\grafana\provisioning mkdir docker\grafana\provisioning

REM Start dependencies
echo 🐳 Starting dependencies (PostgreSQL, Redis, MinIO)...
docker-compose up -d postgres redis minio

REM Wait for PostgreSQL to be ready
echo ⏳ Waiting for PostgreSQL to be ready...
:wait_loop
docker-compose exec -T postgres pg_isready -U calldocker >nul 2>&1
if errorlevel 1 (
    echo Waiting for PostgreSQL...
    timeout /t 2 /nobreak >nul
    goto wait_loop
)

REM Run database migrations
echo 🗄️ Running database migrations...
docker-compose exec -T postgres psql -U calldocker -d calldocker -f /docker-entrypoint-initdb.d/init.sql

echo ✅ Dependencies started successfully!
echo.
echo 📊 Service URLs:
echo   - PostgreSQL: localhost:5432
echo   - Redis: localhost:6379
echo   - MinIO Console: http://localhost:9001
echo   - Prometheus: http://localhost:9090
echo   - Grafana: http://localhost:3001
echo.
echo 🔧 Next steps:
echo   1. Copy env.example to .env and update configuration
echo   2. Run 'cargo build' to build the Rust services
echo   3. Run 'docker-compose up' to start all services
echo   4. Access the application at http://localhost:3000
echo.
echo 🎉 Development environment is ready!
pause
