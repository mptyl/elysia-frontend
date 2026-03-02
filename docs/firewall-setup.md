# Firewall Setup for Athena Services

## Overview
This document lists the inbound ports that must be opened on the corporate firewall (or VPN gateway) to allow traffic to the services running under **/opt/athena**. All services are hosted in Docker containers on the same internal network and are accessed **only from within the UNI network or via VPN**.

## Inbound Ports (TCP)
| Service | Port | Protocol | Description | Source |
|---------|------|----------|-------------|--------|
| **Elysia (backend)** | `8090` | TCP | Main API server for the Elysia application. | UNI internal / VPN |
| **Elysia‑frontend (Next.js)** | `3090` | TCP | Development/production frontend server. | UNI internal / VPN |
| **Supabase PostgreSQL** | `5432` | TCP | Database engine. | UNI internal / VPN |
| **Supabase API** | `8000` | TCP | REST/GraphQL API endpoint. | UNI internal / VPN |
| **Supabase Realtime** | `4000` | TCP | Real‑time websocket service. | UNI internal / VPN |
| **LDAP Emulator** | `8029` | TCP | LDAP service used for development/testing. | UNI internal / VPN |

> **Note:** No additional reverse‑proxy or load‑balancer ports are required.

## Outbound Requirements (recommended)
- DNS: `53` (TCP/UDP) – for name resolution.
- NTP: `123` (UDP) – for time synchronization.
- HTTP/HTTPS (`80/443`) – for pulling external dependencies during builds.

## Suggested Firewall Rules (example using `ufw`)
```bash
# Allow internal/VPN traffic to the required ports
sudo ufw allow from any to any port 8090 proto tcp   # Elysia backend
sudo ufw allow from any to any port 3090 proto tcp   # Frontend
sudo ufw allow from any to any port 5432 proto tcp   # Supabase PostgreSQL
sudo ufw allow from any to any port 8000 proto tcp   # Supabase API
sudo ufw allow from any to any port 4000 proto tcp   # Supabase Realtime
sudo ufw allow from any to any port 8029 proto tcp   # LDAP emulator

# Optional outbound allowances
sudo ufw allow out 53    # DNS
sudo ufw allow out 123   # NTP
```

## Maintenance
- Review the rule set whenever a new service is added.
- If the corporate firewall is managed centrally, provide the above table to the network team.
- Ensure that Docker bridge networking (`docker0`) allows inter‑container communication; this is typically unrestricted on the host.

---
*Generated on 2026‑03‑02 by Antigravity.*
