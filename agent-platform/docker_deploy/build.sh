#!/bin/bash

# FuturX Agent Workspace - Docker Build Script
# This script builds Docker images for production deployment

echo "=========================================="
echo "FuturX Agent Workspace - Docker Build"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_status "Docker and Docker Compose are installed"

# Navigate to docker_deploy directory
cd "$(dirname "$0")"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.production .env
    print_status "Created .env file from template. Please update it with your configuration."
fi

# Create necessary directories
print_status "Creating data directories..."
mkdir -p data uploads

# Build Docker images
print_status "Building Docker images..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    print_status "Docker images built successfully!"
    echo ""
    echo "Images created:"
    docker images | grep faw
    echo ""
    echo "Next steps:"
    echo "1. Review and update .env file with your configuration"
    echo "2. Run ./deploy.sh to start the services"
else
    print_error "Failed to build Docker images"
    exit 1
fi