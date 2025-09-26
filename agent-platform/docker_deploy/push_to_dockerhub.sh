#!/bin/bash

# FuturX Agent Workspace - Docker Hub Push Script
# Version: v0.05

echo "=========================================="
echo "FuturX Agent Workspace - Docker Hub Push"
echo "Version: v0.05"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Docker Hub configuration
DOCKERHUB_USERNAME="elttilz"
DOCKERHUB_REPO="futurx_agent_workspace"
VERSION="v0.05"

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

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check if user is logged in to Docker Hub
echo "Checking Docker Hub login status..."
if ! docker info | grep -q "Username: ${DOCKERHUB_USERNAME}"; then
    print_warning "You need to login to Docker Hub first"
    echo "Please run: docker login -u ${DOCKERHUB_USERNAME}"
    echo "After login, run this script again"
    exit 1
fi

print_status "Docker Hub login confirmed"

# Tag images
print_info "Tagging images for Docker Hub..."

# Tag backend image
docker tag docker_deploy-backend:latest ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-backend
if [ $? -eq 0 ]; then
    print_status "Backend image tagged successfully"
else
    print_error "Failed to tag backend image"
    exit 1
fi

# Tag frontend image
docker tag docker_deploy-frontend:latest ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-frontend
if [ $? -eq 0 ]; then
    print_status "Frontend image tagged successfully"
else
    print_error "Failed to tag frontend image"
    exit 1
fi

# Also create a combined tag for easy reference
docker tag docker_deploy-backend:latest ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}
print_status "Created main version tag"

# Push images to Docker Hub
print_info "Pushing images to Docker Hub..."
echo "This may take a few minutes depending on your internet connection..."

# Push backend
echo ""
print_info "Pushing backend image..."
docker push ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-backend
if [ $? -eq 0 ]; then
    print_status "Backend image pushed successfully"
else
    print_error "Failed to push backend image"
    exit 1
fi

# Push frontend
echo ""
print_info "Pushing frontend image..."
docker push ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-frontend
if [ $? -eq 0 ]; then
    print_status "Frontend image pushed successfully"
else
    print_error "Failed to push frontend image"
    exit 1
fi

# Push main version tag
echo ""
print_info "Pushing main version tag..."
docker push ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}
if [ $? -eq 0 ]; then
    print_status "Main version tag pushed successfully"
else
    print_error "Failed to push main version tag"
fi

# Create latest tags
print_info "Creating and pushing 'latest' tags..."
docker tag docker_deploy-backend:latest ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest-backend
docker tag docker_deploy-frontend:latest ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest-frontend
docker tag docker_deploy-backend:latest ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest

docker push ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest-backend
docker push ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest-frontend
docker push ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest

echo ""
echo "=========================================="
print_status "All images pushed successfully!"
echo ""
echo "Images available at Docker Hub:"
echo "  - ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-backend"
echo "  - ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-frontend"
echo "  - ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}"
echo "  - ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest-backend"
echo "  - ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest-frontend"
echo "  - ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest"
echo ""
echo "To pull images on your server:"
echo "  docker pull ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-backend"
echo "  docker pull ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-frontend"
echo "=========================================="