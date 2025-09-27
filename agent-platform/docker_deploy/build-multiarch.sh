#!/bin/bash

# FuturX Agent Workspace - Multi-Architecture Build Script
# Builds for both AMD64 and ARM64 architectures

echo "=========================================="
echo "FuturX Agent Workspace - Multi-Arch Build"
echo "Version: v0.056"
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
VERSION="v0.056"

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

# Check if buildx is available
print_info "Checking Docker buildx..."
if ! docker buildx version > /dev/null 2>&1; then
    print_error "Docker buildx is not available. Please update Docker."
    exit 1
fi

# Create or use existing buildx builder
print_info "Setting up buildx builder..."
if ! docker buildx ls | grep -q "multiarch-builder"; then
    docker buildx create --name multiarch-builder --driver docker-container --bootstrap
fi
docker buildx use multiarch-builder

print_status "Buildx builder ready"

# Login to Docker Hub
print_info "Please ensure you're logged in to Docker Hub"
print_info "Run: docker login -u ${DOCKERHUB_USERNAME}"

# Build and push backend for multiple architectures
print_info "Building backend for AMD64 and ARM64..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-backend \
  --tag ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest-backend \
  --file backend.multiarch.Dockerfile \
  --push \
  ..

if [ $? -eq 0 ]; then
    print_status "Backend multi-arch build successful"
else
    print_error "Backend build failed"
    exit 1
fi

# Build and push frontend for multiple architectures
print_info "Building frontend for AMD64 and ARM64..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-frontend-fixed \
  --tag ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest-frontend \
  --tag ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION} \
  --tag ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest \
  --file frontend.production.Dockerfile \
  --push \
  ..

if [ $? -eq 0 ]; then
    print_status "Frontend multi-arch build successful"
else
    print_error "Frontend build failed"
    exit 1
fi

echo ""
echo "=========================================="
print_status "Multi-architecture build complete!"
echo ""
echo "Images pushed to Docker Hub:"
echo "  - ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-backend (AMD64 + ARM64)"
echo "  - ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:${VERSION}-frontend-fixed (AMD64 + ARM64)"
echo "  - ${DOCKERHUB_USERNAME}/${DOCKERHUB_REPO}:latest (AMD64 + ARM64)"
echo ""
echo "These images will work on both AMD64 and ARM64 architectures!"
echo "=========================================="