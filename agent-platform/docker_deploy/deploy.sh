#!/bin/bash

# FuturX Agent Workspace - Docker Deploy Script
# This script deploys the application using Docker Compose

echo "=========================================="
echo "FuturX Agent Workspace - Deployment"
echo "Version: v0.05"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Navigate to docker_deploy directory
cd "$(dirname "$0")"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_info "Please run ./build.sh first or create .env from .env.production"
    exit 1
fi

# Parse command line arguments
ACTION=${1:-"start"}

case $ACTION in
    start)
        print_status "Starting FuturX Agent Workspace..."
        docker-compose up -d

        if [ $? -eq 0 ]; then
            print_status "Services started successfully!"
            echo ""
            print_info "Service Status:"
            docker-compose ps
            echo ""
            print_info "Access the application:"
            echo "   Frontend: http://localhost:5173"
            echo "   Backend API: http://localhost:6173/api"
            echo ""
            print_info "Default admin credentials:"
            echo "   Username: admin"
            echo "   Password: admin123"
        else
            print_error "Failed to start services"
            exit 1
        fi
        ;;

    stop)
        print_status "Stopping services..."
        docker-compose down
        print_status "Services stopped"
        ;;

    restart)
        print_status "Restarting services..."
        docker-compose restart
        print_status "Services restarted"
        ;;

    logs)
        print_info "Showing logs (Ctrl+C to exit)..."
        docker-compose logs -f
        ;;

    status)
        print_info "Service status:"
        docker-compose ps
        ;;

    clean)
        print_warning "This will stop services and remove containers, networks, and volumes!"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down -v
            print_status "Cleanup completed"
        else
            print_info "Cleanup cancelled"
        fi
        ;;

    update)
        print_status "Updating services..."
        docker-compose pull
        docker-compose build
        docker-compose up -d
        print_status "Services updated"
        ;;

    *)
        echo "Usage: $0 {start|stop|restart|logs|status|clean|update}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all services"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  logs    - Show service logs"
        echo "  status  - Show service status"
        echo "  clean   - Stop and remove all containers, networks, and volumes"
        echo "  update  - Update and restart services"
        exit 1
        ;;
esac