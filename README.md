# MikroTik DNS Analytics

Sistema de análise de logs DNS do MikroTik com dashboard web interativo e moderno.
Recebe logs DNS via UDP, armazena em SQLite e apresenta estatísticas através de uma interface web React/Next.js.

<img width="1920" height="1213" alt="image" src="https://github.com/user-attachments/assets/5cc9de12-c36c-40c5-9e6c-907f4727a711" />

---

## ✨ Recursos

- **Dashboard em Tempo Real**: Visualização de estatísticas DNS com atualização automática a cada 5 segundos
- **Interface Moderna**: Dashboard Next.js 15 + React 19 com Tailwind CSS e componentes Radix UI
- **Backend Otimizado**: API Go com SQLite, CORS configurado e logging detalhado
- **Análise Completa**: Top domínios, tipos de queries, clientes ativos e histórico de queries
- **Deploy Docker**: Containerização completa com Docker Compose para produção
- **Desenvolvimento**: Makefile com comandos para desenvolvimento local e produção
- **Auto-refresh**: Interface atualiza automaticamente (configurável de 5s a 5min)
- **Responsivo**: Funciona perfeitamente em desktop e mobile

---

## Requirements

- Docker (and optionally Docker Compose)
- MikroTik RouterOS device with DNS logging enabled
- (Optional) Go toolchain if you want to build without Docker

---

## 🚀 Deploy Rápido (Recomendado)

### 1. Usando Makefile (Mais Fácil)

```bash
# Verificar se todas as ferramentas estão disponíveis
make check-tools

# Construir e iniciar todos os serviços
make docker-build
make docker-up

# Verificar logs em tempo real
make docker-logs

# Parar todos os serviços
make docker-down
```

### 2. Docker Compose Direto

```bash
# Construir e iniciar
docker compose up -d --build

# Verificar logs
docker compose logs -f

# Parar
docker compose down
```

**Após iniciar os serviços:**
- **Frontend**: http://localhost:3000 (Dashboard moderno)
- **Backend API**: http://localhost:8080/api/ (API REST)

---

## Web Dashboard

After running, access the dashboard at:
[http://localhost:8080](http://localhost:8080)

---

## MikroTik Configuration

To forward DNS query logs to this server:

1. **Enable DNS logging** on your MikroTik router:
   - Go to **System → Logging** in Winbox/WebFig
   - Add a new rule:
     - **Topics**: `dns`
     - **Action**: `remote`
     - **Remote Address**: `<your_server_ip>`
     - **Remote Port**: `5354`

   Exemplo CLI:

   ```shell
   /system logging add topics=dns action=remote remote=<your_server_ip> remote-port=5354
   ```

2. **Make sure UDP traffic from MikroTik to your server on port 5354 is allowed** by firewalls.

3. **Logs should look like:**

   ```
   2025-07-28 01:57:23 dns query from 192.168.0.126: #710806 horizon-track.globo.com. AAAA
   ```

---

## Docker Compose Example

```yaml
version: "3.8"
services:
  mikrotik-dns:
    build: .
    container_name: mikrotik-dns
    volumes:
      - ./data:/data
    ports:
      - "8080:8080"
      - "5354:5354/udp"
```

---

## Environment Variables

- (No required environment variables. All configuration is static. The database will be created at `/data/dnslogs.db`.)

---

## Customization

- The dashboard static files are located in the `/page` directory.
- Modify or extend the web UI as needed.

---

## Database

- SQLite database will be stored at `/data/dnslogs.db` (persisted via Docker volume if mapped).
- Retains only last 24 hours of queries (older data is purged automatically).

---

## Development (build manually)

**Build:**

```sh
apk add --no-cache gcc musl-dev sqlite-dev
go build -o mikrotik-dns .
```

**Run:**

```sh
./mikrotik-dns
```

---

## REST API

- `/api/top-domains`
- `/api/query-types`
- `/api/blocked-domains`
- `/api/clients`
- `/api/client-queries?client=<ip>&page=1&page_size=20`

All endpoints return JSON.

---

## Troubleshooting

- If you see `DB insert error: Binary was compiled with 'CGO_ENABLED=0'`, make sure your build uses `CGO_ENABLED=1` and the runtime container has `sqlite-libs` installed.
- If no data appears in the dashboard, check MikroTik logs and confirm UDP packets reach your server.
