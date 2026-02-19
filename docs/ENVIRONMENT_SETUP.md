# Environment Setup Guide

This guide explains how to configure Athena for different environments.

## Overview

Athena supports three separate deployment environments:
1. **Local Development**: localhost with LDAP emulator
2. **Remote Server**: VPN/IP access (e.g., 10.1.1.11) with real Entra ID
3. **Production**: Docker Swarm with HTTPS and real Entra ID

Each environment requires matching configuration across multiple components.

## Quick Start

### 1. Copy Environment Templates

```bash
# Frontend
cp elysia-frontend/.env.example elysia-frontend/.env.local

# Supabase
cp supabase-project/.env.example supabase-project/.env

# LDAP Emulator (only for local dev)
cp sandbox/ldap/.env.example sandbox/ldap/.env
```

### 2. Generate Supabase Secrets

```bash
cd supabase-project
bash utils/generate-keys.sh
```

This generates JWT secrets and API keys. Copy the `ANON_KEY` to your frontend `.env.local`.

### 3. Configure for Your Environment

Choose one of the configuration profiles below and customize the template files.

## Configuration Profiles

### Profile 1: Local Development

**Use case**: Developing on your Mac with emulated authentication

**Frontend** (`elysia-frontend/.env.local`):
```bash
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3090
NEXT_PUBLIC_AUTH_PROVIDER=emulator
AUTH_PROVIDER_MODE=emulator
NEXT_PUBLIC_SUPABASE_URL=/supabase
SUPABASE_INTERNAL_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<copy_from_supabase_ANON_KEY>
ENTRA_EMULATOR_INTERNAL_HOST=http://host.docker.internal:8029
NEXT_PUBLIC_ENTRA_EMULATOR_PUBLIC_BASE=/entra
ENTRA_INTERNAL_URL=http://127.0.0.1:8029
ELYSIA_INTERNAL_URL=http://127.0.0.1:8090
NEXT_PUBLIC_ELYSIA_WS_PORT=8090
```

**Supabase** (`supabase-project/.env`):
```bash
SITE_URL=http://localhost:3090
ADDITIONAL_REDIRECT_URLS=http://localhost:3090,http://localhost:3090/login,http://localhost:3090/auth/callback,http://localhost:3090/supabase/auth/v1/callback
API_EXTERNAL_URL=http://localhost:8000

# Use Scenario A (LDAP Emulator) - uncomment these lines:
GOTRUE_EXTERNAL_AZURE_ENABLED=true
GOTRUE_EXTERNAL_AZURE_CLIENT_ID=test-app-123
GOTRUE_EXTERNAL_AZURE_SECRET=test-secret
GOTRUE_EXTERNAL_AZURE_URL=http://host.docker.internal:8029/common
GOTRUE_EXTERNAL_AZURE_REDIRECT_URI=http://localhost:3090/supabase/auth/v1/callback
APP_PUBLIC_ORIGIN=http://localhost:3090
GOTRUE_MAILER_EXTERNAL_HOSTS=localhost,127.0.0.1
```

**LDAP Emulator** (`sandbox/ldap/.env`):
```bash
EMULATOR_HOST=0.0.0.0
EMULATOR_PORT=8029
TENANT_ID=contoso
ISSUER_URL=http://host.docker.internal:8029
ALLOW_DYNAMIC_REDIRECT_URI=true
DEFAULT_APP_REDIRECT_URIS=http://localhost:3090/supabase/auth/v1/callback
TOKEN_EXPIRY_SECONDS=3600
REFRESH_TOKEN_EXPIRY_DAYS=14
```

**Start services**:
```bash
# Terminal 1 - Supabase
cd supabase-project
docker compose up -d

# Terminal 2 - LDAP Emulator
cd sandbox/ldap
docker compose up -d

# Terminal 3 - Weaviate
cd weaviate
docker compose up -d

# Terminal 4 - Elysia Backend
cd elysia
source .venv/bin/activate
elysia start

# Terminal 5 - Frontend
cd elysia-frontend
npm run dev
```

**Access**: Open browser to `http://localhost:3090`

### Profile 2: Remote Server

**Use case**: Testing on remote server accessible via IP (e.g., 10.1.1.11)

**Frontend** (`elysia-frontend/.env.local` on server):
```bash
NEXT_PUBLIC_APP_ORIGIN=http://10.1.1.11:3090
NEXT_PUBLIC_AUTH_PROVIDER=entra
AUTH_PROVIDER_MODE=entra
NEXT_PUBLIC_SUPABASE_URL=/supabase
SUPABASE_INTERNAL_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<copy_from_supabase_ANON_KEY>
# NO emulator configuration needed
ELYSIA_INTERNAL_URL=http://127.0.0.1:8090
NEXT_PUBLIC_ELYSIA_WS_PORT=8090
```

**Supabase** (`supabase-project/.env` on server):
```bash
SITE_URL=http://10.1.1.11:3090
ADDITIONAL_REDIRECT_URLS=http://10.1.1.11:3090,http://10.1.1.11:3090/login,http://10.1.1.11:3090/auth/callback,http://10.1.1.11:3090/supabase/auth/v1/callback
API_EXTERNAL_URL=http://10.1.1.11:8000

# Use Scenario B (Real Entra ID) - uncomment and customize:
GOTRUE_EXTERNAL_AZURE_ENABLED=true
GOTRUE_EXTERNAL_AZURE_CLIENT_ID=<your_real_client_id>
GOTRUE_EXTERNAL_AZURE_SECRET=<your_real_secret>
GOTRUE_EXTERNAL_AZURE_URL=https://login.microsoftonline.com/<your_tenant_id>/v2.0
GOTRUE_EXTERNAL_AZURE_REDIRECT_URI=http://10.1.1.11:3090/supabase/auth/v1/callback
APP_PUBLIC_ORIGIN=http://10.1.1.11:3090
GOTRUE_MAILER_EXTERNAL_HOSTS=10.1.1.11,localhost,127.0.0.1
```

**LDAP Emulator**: **NOT STARTED** (not needed in this environment)

**Access**: Open browser to `http://10.1.1.11:3090`

### Profile 3: Production

**Use case**: Production deployment with Docker Swarm and HTTPS

**Frontend** (`elysia-frontend/.env.local` or Docker secrets):
```bash
NEXT_PUBLIC_APP_ORIGIN=https://athena.yourcompany.com
NEXT_PUBLIC_AUTH_PROVIDER=entra
AUTH_PROVIDER_MODE=entra
NEXT_PUBLIC_SUPABASE_URL=/supabase
SUPABASE_INTERNAL_URL=http://supabase-kong:8000  # Docker internal network
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<production_anon_key>
ELYSIA_INTERNAL_URL=http://elysia-backend:8090
NEXT_PUBLIC_ELYSIA_WS_PORT=443  # HTTPS WebSocket
```

**Supabase** (`supabase-project/.env` in production):
```bash
SITE_URL=https://athena.yourcompany.com
ADDITIONAL_REDIRECT_URLS=https://athena.yourcompany.com,https://athena.yourcompany.com/login,https://athena.yourcompany.com/auth/callback,https://athena.yourcompany.com/supabase/auth/v1/callback
API_EXTERNAL_URL=https://athena.yourcompany.com/supabase

# Use Scenario C (Production Entra ID):
GOTRUE_EXTERNAL_AZURE_ENABLED=true
GOTRUE_EXTERNAL_AZURE_CLIENT_ID=<production_client_id>
GOTRUE_EXTERNAL_AZURE_SECRET=<production_secret>
GOTRUE_EXTERNAL_AZURE_URL=https://login.microsoftonline.com/<tenant_id>/v2.0
GOTRUE_EXTERNAL_AZURE_REDIRECT_URI=https://athena.yourcompany.com/supabase/auth/v1/callback
APP_PUBLIC_ORIGIN=https://athena.yourcompany.com
GOTRUE_MAILER_EXTERNAL_HOSTS=athena.yourcompany.com
```

**LDAP Emulator**: **NOT DEPLOYED** (not needed in production)

## Critical Configuration Rules

### Rule 1: Origin Consistency

These **MUST** all match:
- `NEXT_PUBLIC_APP_ORIGIN` (frontend)
- `SITE_URL` (supabase)
- Base of `GOTRUE_EXTERNAL_AZURE_REDIRECT_URI` (supabase)

Example for local dev:
```
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3090
SITE_URL=http://localhost:3090
GOTRUE_EXTERNAL_AZURE_REDIRECT_URI=http://localhost:3090/supabase/auth/v1/callback
```

### Rule 2: Redirect URI Inclusion

`ADDITIONAL_REDIRECT_URLS` must include at minimum:
- `<SITE_URL>`
- `<SITE_URL>/login`
- `<SITE_URL>/auth/callback`
- `<SITE_URL>/supabase/auth/v1/callback`

### Rule 3: Auth Provider Mode

When using emulator:
- Frontend: `NEXT_PUBLIC_AUTH_PROVIDER=emulator`
- Supabase: `GOTRUE_EXTERNAL_AZURE_URL=http://host.docker.internal:8029/common`
- Emulator: Must be running

When using real Entra ID:
- Frontend: `NEXT_PUBLIC_AUTH_PROVIDER=entra`
- Supabase: `GOTRUE_EXTERNAL_AZURE_URL=https://login.microsoftonline.com/<tenant>/v2.0`
- Emulator: Should NOT be running

## Troubleshooting

### Symptom: Redirected to wrong URL after login

**Cause**: Mismatch between `NEXT_PUBLIC_APP_ORIGIN` and `SITE_URL`

**Fix**: Ensure both variables have the same value. Restart services:
```bash
# Restart Supabase (auth needs to reload config)
cd supabase-project
docker compose restart auth

# Restart Frontend
cd elysia-frontend
# Ctrl+C and npm run dev again
```

### Symptom: "Invalid redirect URI" error

**Cause**: The redirect URI is not in Supabase's allow-list

**Fix**: Check `ADDITIONAL_REDIRECT_URLS` includes the callback URI. Format:
```
ADDITIONAL_REDIRECT_URLS=http://localhost:3090,http://localhost:3090/login,http://localhost:3090/auth/callback,http://localhost:3090/supabase/auth/v1/callback
```

### Symptom: OAuth works on localhost but not on 10.1.1.11

**Cause**: Configuration still has `localhost` hardcoded

**Fix**: Search all `.env` files for `localhost` and replace with actual IP/domain:
```bash
grep -r "localhost" elysia-frontend/.env.local supabase-project/.env
```

### Symptom: Emulator returns 404 or connection refused

**Cause**: Emulator not running or wrong URL

**Fix**:
1. Check emulator is running: `cd sandbox/ldap && docker compose ps`
2. Verify `ISSUER_URL=http://host.docker.internal:8029`
3. Check frontend rewrites in `next.config.js` include `/entra` path

### Symptom: "Missing NEXT_PUBLIC_APP_ORIGIN environment variable" error

**Cause**: Frontend started without setting `NEXT_PUBLIC_APP_ORIGIN` in `.env.local`

**Fix**: Add `NEXT_PUBLIC_APP_ORIGIN=http://localhost:3090` (or your environment URL) to `elysia-frontend/.env.local` and restart the frontend.

## Switching Between Environments

To switch from local to remote (or vice versa):

1. **Stop all services**
2. **Update `.env.local` and `.env` files** with new environment values
3. **Restart services in order**:
   - Supabase first (so auth container loads new config)
   - Emulator (if needed for local)
   - Backend
   - Frontend last
4. **Clear browser cookies** for the old domain
5. **Test login flow** from browser

## Security Notes

- **NEVER commit `.env.local` or `.env` files** - they contain secrets
- **DO commit `.env.example` files** - they are templates with placeholders
- **Change all default secrets** before deploying to production
- **Use HTTPS** in production (not HTTP)
- **Disable emulator** in production (set `NEXT_PUBLIC_AUTH_PROVIDER=entra`)
