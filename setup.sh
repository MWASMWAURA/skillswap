#!/bin/bash

# SkillSwap Project Setup Script
# This script sets up the entire SkillSwap project environment

set -e

echo "🚀 Starting SkillSwap Project Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker is installed"
}

# Check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_success "Docker Compose is installed"
}

# Create necessary directories
setup_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p frontend/.next/cache
    mkdir -p ai/data
    
    print_success "Directories created"
}

# Copy environment files if they don't exist
setup_environment() {
    print_status "Setting up environment files..."
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        cp .env.example backend/.env
        print_success "Created backend/.env from .env.example"
    else
        print_warning "backend/.env already exists, skipping..."
    fi
    
    # Frontend environment
    if [ ! -f "frontend/.env.local" ]; then
        echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > frontend/.env.local
        echo "NEXT_PUBLIC_AI_URL=http://localhost:8000" >> frontend/.env.local
        echo "NEXT_PUBLIC_WS_URL=ws://localhost:5000" >> frontend/.env.local
        print_success "Created frontend/.env.local"
    else
        print_warning "frontend/.env.local already exists, skipping..."
    fi
    
    # AI environment
    if [ ! -f "ai/.env" ]; then
        echo "# AI Service Environment" > ai/.env
        echo "MODEL_PATH=./models" >> ai/.env
        echo "DATA_PATH=./data" >> ai/.env
        print_success "Created ai/.env"
    else
        print_warning "ai/.env already exists, skipping..."
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    print_success "Backend dependencies installed"
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_success "Frontend dependencies installed"
    
    # AI dependencies
    print_status "Installing AI dependencies..."
    cd ai
    python3 -m pip install -r requirements.txt
    cd ..
    print_success "AI dependencies installed"
}

# Generate Prisma client
generate_prisma_client() {
    print_status "Generating Prisma client..."
    cd backend
    npx prisma generate
    cd ..
    print_success "Prisma client generated"
}

# Build Docker images
build_docker_images() {
    print_status "Building Docker images..."
    docker-compose build
    print_success "Docker images built"
}

# Start services
start_services() {
    print_status "Starting services with Docker Compose..."
    docker-compose up -d postgres redis
    
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    print_status "Running database migrations..."
    docker-compose exec backend npx prisma migrate deploy
    
    # Seed database
    print_status "Seeding database..."
    docker-compose exec backend npm run seed
    
    # Start all services
    print_status "Starting all services..."
    docker-compose up -d
    print_success "All services started"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Check backend
    if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed"
    fi
    
    # Check AI service
    if curl -f http://localhost:8000/docs > /dev/null 2>&1; then
        print_success "AI service is healthy"
    else
        print_warning "AI service health check failed"
    fi
}

# Display success message
show_completion_message() {
    echo ""
    echo "🎉 SkillSwap Project Setup Complete!"
    echo ""
    echo "Services running:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • Backend: http://localhost:5000"
    echo "  • AI Service: http://localhost:8000"
    echo "  • API Documentation: http://localhost:8000/docs"
    echo "  • Database: PostgreSQL on port 5432"
    echo "  • Redis: redis://localhost:6379"
    echo ""
    echo "To stop services: docker-compose down"
    echo "To view logs: docker-compose logs -f [service-name]"
    echo ""
    echo "Happy coding! 🚀"
}

# Main execution
main() {
    echo "SkillSwap Project Setup"
    echo "======================="
    echo ""
    
    check_docker
    check_docker_compose
    setup_directories
    setup_environment
    install_dependencies
    generate_prisma_client
    build_docker_images
    start_services
    health_check
    show_completion_message
}

# Run main function
main "$@"