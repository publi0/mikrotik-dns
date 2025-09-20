# ---------- Frontend build ----------
FROM node:20-alpine AS web-build
WORKDIR /app/page
# Copy package files first for better caching
COPY page/package*.json ./
RUN npm ci --legacy-peer-deps
# Copy frontend source and build
COPY page/ .
# Set backend URL for single container during build
ENV BACKEND_URL=http://127.0.0.1:8080
RUN npm run build

# ---------- Backend build ----------
FROM golang:1.24-alpine AS api-build
WORKDIR /src
# Install build dependencies for CGO + SQLite
RUN apk add --no-cache gcc musl-dev sqlite-dev
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Build with CGO enabled for SQLite
ENV CGO_ENABLED=1 GOOS=linux GOARCH=amd64
RUN go build -o /out/mikrotik-dns ./main.go

# ---------- Runtime ----------
FROM node:20-alpine
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache tini ca-certificates sqlite-libs tzdata

# Copy backend binary
COPY --from=api-build /out/mikrotik-dns /usr/local/bin/mikrotik-dns

# Copy Next.js standalone build
COPY --from=web-build /app/page/.next/standalone ./page/
COPY --from=web-build /app/page/public ./page/public
COPY --from=web-build /app/page/.next/static ./page/.next/static

# Set environment variables
ENV PORT=3000 \
    NODE_ENV=production \
    DATABASE_PATH=/data/queries.db \
    BACKEND_URL=http://127.0.0.1:8080

# Create data volume
RUN mkdir -p /data
VOLUME ["/data"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:${PORT} >/dev/null || exit 1

# Create entrypoint script
RUN cat > /entrypoint.sh << 'EOF'
#!/bin/sh
set -e

echo "Starting MikroTik DNS backend..."
DATABASE_PATH=/data/queries.db /usr/local/bin/mikrotik-dns &
API_PID=$!

echo "Waiting for backend to start..."
sleep 2

echo "Starting Next.js frontend..."
cd /app/page
HOSTNAME=0.0.0.0 node server.js &
FRONTEND_PID=$!

# Wait for both processes
wait $API_PID $FRONTEND_PID
EOF

RUN chmod +x /entrypoint.sh

# Expose ports
EXPOSE 3000/tcp
EXPOSE 5354/udp

# Use tini as PID 1 to handle signals properly
ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]
