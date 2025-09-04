#!/bin/bash

# CallDocker Database Setup Script
# This script sets up the database for development and testing

echo "🚀 Setting up CallDocker Database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backups
mkdir -p logs
mkdir -p uploads

# Start database services
echo "🐘 Starting PostgreSQL and Redis..."
docker-compose -f docker-compose.db.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check database connection
echo "🔍 Testing database connection..."
if docker exec calldocker-postgres pg_isready -U calldocker_user -d calldocker; then
    echo "✅ Database is ready!"
else
    echo "❌ Database connection failed. Please check the logs:"
    docker-compose -f docker-compose.db.yml logs postgres
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# CallDocker Development Environment
NODE_ENV=development
PORT=3000
HOST=localhost
APP_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=calldocker
DB_USER=calldocker_user
DB_PASSWORD=calldocker_password

# Authentication & Security
JWT_SECRET=dev_jwt_secret_key_here
SESSION_SECRET=dev_session_secret_here
BCRYPT_ROUNDS=12

# Global Admin Settings
GLOBAL_ADMIN_EMAIL=admin@calldocker.com
GLOBAL_ADMIN_PASSWORD=admin123

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Settings
CORS_ORIGIN=http://localhost:3000
EOF
    echo "✅ .env file created!"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "📊 Database Access:"
echo "   - PostgreSQL: localhost:5432"
echo "   - Username: calldocker_user"
echo "   - Password: calldocker_password"
echo "   - Database: calldocker"
echo ""
echo "🔧 pgAdmin: http://localhost:5050"
echo "   - Email: admin@calldocker.com"
echo "   - Password: admin123"
echo ""
echo "📱 Redis: localhost:6379"
echo ""
echo "🚀 Next steps:"
echo "   1. Start the application: npm start"
echo "   2. Test company registration: http://localhost:3000/company-registration"
echo "   3. Access admin dashboard: http://localhost:3000/admin"
echo ""
echo "💡 To stop database services: docker-compose -f docker-compose.db.yml down"
echo "💡 To view logs: docker-compose -f docker-compose.db.yml logs -f"

