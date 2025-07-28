FROM golang:1.24-alpine AS builder
WORKDIR /app

# Dependências de build para CGO + SQLite
RUN apk add --no-cache gcc musl-dev sqlite-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build com CGO ativado
RUN CGO_ENABLED=1 go build -o /mikrotik-dns .

# Stage runtime mínimo (apenas binário + assets)
FROM alpine:latest
WORKDIR /

# SQLite para o binário e assets da página
RUN apk add --no-cache sqlite-libs

COPY --from=builder /mikrotik-dns /mikrotik-dns
COPY --from=builder /app/page /page

# Crie a pasta para o banco de dados, se necessário
RUN mkdir -p /data

EXPOSE 8080
EXPOSE 5354

CMD ["/mikrotik-dns"]
