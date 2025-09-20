# MikroTik DNS Analytics - Single Image Deployment Commands

.PHONY: help backend frontend dev clean install build run

# Default target
help:
	@echo "MikroTik DNS Analytics - Available Commands:"
	@echo ""
	@echo "🔥 Single Image Commands (Primary):"
	@echo "  make build            - Build single Docker image"
	@echo "  make up               - Start with Docker Compose"
	@echo "  make down             - Stop Docker Compose services"
	@echo "  make logs             - Show container logs"
	@echo "  make run              - Run single Docker image directly"
	@echo "  make stop             - Stop single Docker container"
	@echo "  make restart          - Restart services"
	@echo ""
	@echo "🔧 Development Commands:"
	@echo "  make dev              - Show instructions to run development environment"
	@echo "  make dev-full         - Start both backend and frontend (backend in background)"
	@echo "  make dev-backend      - Start backend in development mode (port 8080)"
	@echo "  make dev-frontend     - Start frontend in development mode (port 3000)"
	@echo ""
	@echo "🏗️  Local Build Commands:"
	@echo "  make build-backend    - Build backend binary"
	@echo "  make build-frontend   - Build frontend for production"
	@echo "  make build-local      - Build both backend and frontend locally"
	@echo ""
	@echo "🧹 Utility Commands:"
	@echo "  make clean            - Clean build artifacts"
	@echo "  make install          - Install frontend dependencies"
	@echo "  make check-tools      - Check if required tools are installed"
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
build-local: build-backend build-frontend
	@echo "✅ All components built successfully!"

# Single image commands (Primary)
build:
	@echo "🔥 Building single Docker image..."
	docker build -t ghcr.io/publi0/mikrotik-dns:dev .
	@echo "✅ Single image built successfully!"

up:
	@echo "🔥 Starting with Docker Compose..."
	docker compose up -d
	@echo "✅ Services started!"
	@echo "🌐 Web dashboard available at: http://localhost:3000"

down:
	@echo "🔥 Stopping Docker Compose services..."
	docker compose down
	@echo "✅ Services stopped!"

logs:
	@echo "🔥 Showing container logs..."
	docker compose logs -f

run:
	@echo "🔥 Running single Docker image..."
	docker run --rm -d \
		--name mikrotik-dns-single \
		-p 3000:3000 \
		-p 5354:5354/udp \
		-v $(PWD)/data:/data \
		ghcr.io/publi0/mikrotik-dns:dev
	@echo "✅ Container started!"
	@echo "🌐 Web dashboard available at: http://localhost:3000"

stop:
	@echo "🔥 Stopping single Docker container..."
	@docker stop mikrotik-dns-single 2>/dev/null || echo "ℹ️  Container not running"
	@echo "✅ Container stopped!"

restart: down up
	@echo "✅ Services restarted!"

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

# Utility commands
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -f mikrotik-dns
	@rm -f backend.pid backend.log
	@rm -rf page/.next
	@rm -rf page/dist
	@echo "✅ Clean complete!"

dev-stop:
	@echo "⏹️  Stopping development services..."
	@if [ -f backend.pid ]; then kill `cat backend.pid` && rm backend.pid; echo "✅ Backend stopped"; else echo "ℹ️  Backend not running"; fi

dev-logs:
	@if [ -f backend.log ]; then tail -f backend.log; else echo "❌ Backend log not found. Is the backend running?"; fi

# Check if required tools are installed
check-tools:
	@command -v go >/dev/null 2>&1 || { echo "❌ Go is required but not installed. Visit https://golang.org/"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Visit https://nodejs.org/"; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Visit https://docker.com/"; exit 1; }
	@docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }
	@echo "✅ All required tools are available!"
