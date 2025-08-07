# MikroTik DNS Analytics - Build and Deployment Commands

.PHONY: help backend frontend dev clean install build run

# Default target
help:
	@echo "MikroTik DNS Analytics - Available Commands:"
	@echo ""
	@echo "🔧 Development Commands:"
	@echo "  make dev              - Show instructions to run development environment"
	@echo "  make dev-full         - Start both backend and frontend (backend in background)"
	@echo "  make dev-backend      - Start backend in development mode (port 8080)"
	@echo "  make dev-frontend     - Start frontend in development mode (port 3000)"
	@echo ""
	@echo "🏗️  Build Commands:"
	@echo "  make build            - Build both backend and frontend for production"
	@echo "  make build-backend    - Build backend binary"
	@echo "  make build-frontend   - Build frontend for production"
	@echo ""
	@echo "🚀 Deploy Commands:"
	@echo "  make run              - Run backend (requires build-backend first)"
	@echo "  make run-backend      - Build and run backend"
	@echo "  make run-frontend     - Build and run frontend production server"
	@echo ""
	@echo "🐳 Docker Commands:"
	@echo "  make docker-build     - Build Docker images for both services"
	@echo "  make docker-up        - Start all services with Docker Compose"
	@echo "  make docker-down      - Stop all Docker services"
	@echo "  make docker-logs      - Show logs from all Docker services"
	@echo ""
	@echo "🧹 Utility Commands:"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make install          - Install frontend dependencies"
	@echo "  make logs             - Show backend logs (if running)"
	@echo ""

# Backend commands
build-backend:
	@echo "🏗️  Building backend..."
	go build -ldflags="-s -w" -o mikrotik-dns main.go
	@echo "✅ Backend built successfully!"

run-backend: build-backend
	@echo "🚀 Starting backend server..."
	./mikrotik-dns

dev-backend:
	@echo "🔧 Starting backend in development mode..."
	go run main.go

# Frontend commands
install:
	@echo "📦 Installing frontend dependencies..."
	cd page && npm install --legacy-peer-deps

build-frontend: install
	@echo "🏗️  Building frontend..."
	cd page && npm run build
	@echo "✅ Frontend built successfully!"

dev-frontend: install
	@echo "🔧 Starting frontend development server..."
	cd page && npm run dev

run-frontend: build-frontend
	@echo "🚀 Starting frontend production server..."
	cd page && npm start

# Combined commands
build: build-backend build-frontend
	@echo "✅ All components built successfully!"

dev:
	@echo "🔧 Starting development environment..."
	@echo "ℹ️  Run the following commands in separate terminals:"
	@echo "   Terminal 1: make dev-backend"
	@echo "   Terminal 2: make dev-frontend"
	@echo ""
	@echo "🌐 Backend API will be available at: http://localhost:8080/api/"
	@echo "🖥️  Frontend will be available at:   http://localhost:3000"
	@echo ""

dev-full:
	@echo "🔧 Starting full development environment..."
	@echo "Starting backend in background..."
	@nohup make dev-backend > backend.log 2>&1 & echo $$! > backend.pid
	@sleep 2
	@echo "Starting frontend..."
	@make dev-frontend

run: run-backend

# Utility commands
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -f mikrotik-dns
	@rm -f backend.pid backend.log
	@rm -rf page/.next
	@rm -rf page/dist
	@echo "✅ Clean complete!"

logs:
	@if [ -f backend.log ]; then tail -f backend.log; else echo "❌ Backend log not found. Is the backend running?"; fi

stop:
	@echo "⏹️  Stopping services..."
	@if [ -f backend.pid ]; then kill `cat backend.pid` && rm backend.pid; echo "✅ Backend stopped"; else echo "ℹ️  Backend not running"; fi

# Docker commands
docker-build:
	@echo "🐳 Building Docker images..."
	docker compose build
	@echo "✅ Docker images built successfully!"

docker-up:
	@echo "🐳 Starting services with Docker Compose..."
	docker compose up -d
	@echo "✅ Services started!"
	@echo "🌐 Backend API available at: http://localhost:8080/api/"
	@echo "🖥️  Frontend available at:   http://localhost:3000"

docker-down:
	@echo "🐳 Stopping Docker services..."
	docker compose down
	@echo "✅ Services stopped!"

docker-logs:
	@echo "🐳 Showing Docker logs..."
	docker compose logs -f

# Check if required tools are installed
check-tools:
	@command -v go >/dev/null 2>&1 || { echo "❌ Go is required but not installed. Visit https://golang.org/"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Visit https://nodejs.org/"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Visit https://docker.com/"; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }
	@echo "✅ All required tools are available!"
