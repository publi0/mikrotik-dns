# mikrotik-dns-dashboard

A lightweight self-hosted dashboard for visualizing DNS queries from your MikroTik router.
It receives DNS query logs via UDP from a MikroTik device and stores/analyzes them using SQLite, exposing a web dashboard with statistics via a web interface.

---

## Features

- Collects DNS query logs from MikroTik via UDP
- Stores logs in a local SQLite database
- Exposes REST API for dashboard and statistics
- Simple web interface (served at `/`)
- View top queried domains, query types, blocked queries, and per-client stats
- All code and dashboard are containerized (Docker/Alpine, no dependencies on host)

---

## Requirements

- Docker (and optionally Docker Compose)
- MikroTik RouterOS device with DNS logging enabled
- (Optional) Go toolchain if you want to build without Docker

---

## Quick Start (Docker Compose)

Clone this repository:

```sh
git clone https://github.com/yourusername/mikrotik-dns-dashboard.git
cd mikrotik-dns-dashboard
```

**Build and run:**

```sh
docker compose up --build
```

This will:

- Build the Go binary with SQLite support (CGO enabled)
- Run the HTTP server on port `8080`
- Listen for UDP log input on port `5354`
- Persist the SQLite database in the `/data` directory inside the container

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
