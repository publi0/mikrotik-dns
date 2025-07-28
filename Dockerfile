
# Use the official Go image as a parent image
FROM golang:1.24-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy the Go module and sum files
COPY go.mod go.sum ./

# Download Go module dependencies
RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the Go application for a static build
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /mikrotik-dns .

# Use a minimal image for the final stage
FROM alpine:latest

# Copy the static binary from the builder stage
COPY --from=builder /mikrotik-dns /mikrotik-dns

# Copy the web page assets
COPY ./page /page

# Expose port 8989 to the outside world
EXPOSE 8080

# Command to run the executable
ENTRYPOINT ["/mikrotik-dns"]
