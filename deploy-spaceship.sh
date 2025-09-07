#!/bin/bash

# Spaceship Deployment Script for CallDocker
echo "🚀 Deploying CallDocker to Spaceship..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if spaceship CLI is installed
if ! command -v spaceship &> /dev/null; then
    print_error "Spaceship CLI is not installed. Please install it first:"
    echo "curl -sSL https://get.spaceship.com/install.sh | bash"
    exit 1
fi

# Login to Spaceship (if not already logged in)
print_status "Checking Spaceship authentication..."
if ! spaceship auth status > /dev/null 2>&1; then
    print_status "Please login to Spaceship:"
    spaceship auth login
fi

# Build the Docker image
print_status "Building Docker image..."
docker build -f Dockerfile.spaceship -t calldocker-app:latest .

if [ $? -ne 0 ]; then
    print_error "Docker build failed!"
    exit 1
fi

print_success "Docker image built successfully!"

# Deploy to Spaceship
print_status "Deploying to Spaceship..."
spaceship deploy --config spaceship.yaml --env-file spaceship.env

if [ $? -eq 0 ]; then
    print_success "Deployment completed successfully!"
    print_status "Your app should be available at your Spaceship domain"
else
    print_error "Deployment failed!"
    exit 1
fi
