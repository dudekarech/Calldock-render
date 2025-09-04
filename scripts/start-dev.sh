#!/bin/bash

# CallDocker Development Startup Script

set -e

echo "🚀 Starting CallDocker Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please review and update configuration if needed."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p docker/postgres
mkdir -p docker/nginx
mkdir -p docker/prometheus
mkdir -p docker/grafana/provisioning

# Start dependencies
echo "🐳 Starting dependencies (PostgreSQL, Redis, MinIO)..."
docker-compose up -d postgres redis minio

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U calldocker; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose exec -T postgres psql -U calldocker -d calldocker -f /docker-entrypoint-initdb.d/init.sql

echo "✅ Dependencies started successfully!"
echo ""
echo "📊 Service URLs:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - MinIO Console: http://localhost:9001"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3001"
echo ""
echo "🔧 Next steps:"
echo "  1. Copy env.example to .env and update configuration"
echo "  2. Run 'cargo build' to build the Rust services"
echo "  3. Run 'docker-compose up' to start all services"
echo "  4. Access the application at http://localhost:3000"
echo ""
echo "🎉 Development environment is ready!"
