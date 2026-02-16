# Setup Athena su Mac (Sviluppo Locale)

Guida per configurare l'intero stack auth di Athena su macOS dopo un `git pull`.

## Prerequisiti

- **Docker Desktop for Mac** installato e attivo
- **Node.js 18+** e **npm**
- **Git** configurato con accesso ai repo GitHub

## 1. Clone dei repository

```bash
mkdir -p ~/athena && cd ~/athena

git clone https://github.com/mptyl/elysia-frontend.git
git clone https://github.com/mptyl/ldap-emulator.git
git clone https://github.com/mptyl/supabase-project.git
```

Per aggiornamenti successivi:

```bash
cd ~/athena
git -C elysia-frontend pull
git -C ldap-emulator pull
git -C supabase-project pull
```

## 2. Configurazione environment files

### 2a. Supabase

```bash
cd ~/athena/supabase-project
cp .env.example .env

# Genera secrets (JWT, ANON_KEY, SERVICE_ROLE_KEY, etc.)
bash utils/generate-keys.sh
```

Lo script `generate-keys.sh` aggiorna `.env` con valori sicuri generati casualmente.
Prendi nota del valore `ANON_KEY` generato: ti servirà al passo 2b.

### 2b. Frontend

```bash
cd ~/athena/elysia-frontend
cp config/env/.env.frontend.local.example .env.local
```

Modifica `.env.local` e imposta `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con la `ANON_KEY` del passo 2a:

```
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...il-valore-generato...
```

Tutti gli altri valori del template `.env.frontend.local.example` usano `localhost` e sono pronti per l'uso locale.

### 2c. LDAP Emulator (Entra ID)

```bash
cd ~/athena/ldap-emulator
cp .env.example .env
```

Il template usa `localhost` e non richiede modifiche per sviluppo locale.

## 3. Avvio dello stack

Ordine di avvio: infrastruttura prima, frontend alla fine.

```bash
# 1. Supabase (DB, Auth, Kong gateway)
docker compose -f ~/athena/supabase-project/docker-compose.yml up -d

# 2. Entra ID Emulator
docker compose -f ~/athena/ldap-emulator/docker-compose.yml up -d

# 3. Frontend
cd ~/athena/elysia-frontend
npm install
npm run dev
```

## 4. Verifica

### Health checks

```bash
# Supabase Kong gateway
curl -f http://localhost:8000/auth/v1/health

# Entra ID emulator
curl -f http://localhost:8029/health

# OIDC discovery
curl -f http://localhost:8029/common/v2.0/.well-known/openid-configuration
```

### Verifica configurazione auth

```bash
bash ~/athena/elysia-frontend/scripts/auth-config/verify-auth-config.sh
```

### Login test

1. Apri http://localhost:3090
2. Clicca "Accedi con Microsoft"
3. Credenziali: `demo` / `demo123`
4. Dopo il login dovresti essere reindirizzato alla home

### Credenziali di test disponibili

| Utente | Email | Password |
|--------|-------|----------|
| Demo | `demo@uni.local` | `demo123` |
| Marco | `marco@uni.local` | `marco123` |
| Simone | `simone@uni.local` | `simone123` |
| Leo | `leo@uni.local` | `leo123` |
| Sofia | `sofia@uni.local` | `sofia123` |
| Lisa | `lisa@uni.local` | `lisa123` |

## 5. Porte utilizzate

| Servizio | Porta | Note |
|----------|-------|------|
| Frontend (Next.js) | 3090 | Proxy per /supabase e /entra |
| Supabase Kong | 8000 | Gateway API |
| Entra ID Emulator | 8029 | OAuth/OIDC |
| Elysia Backend | 8090 | RAG engine (opzionale per solo auth) |
| PostgreSQL | 5432 | Supabase DB |

## 6. Variabili d'ambiente chiave

### Frontend (`elysia-frontend/.env.local`)

| Variabile | Valore locale | Descrizione |
|-----------|--------------|-------------|
| `NEXT_PUBLIC_AUTH_PROVIDER` | `emulator` | `emulator` per dev, `entra` per prod |
| `NEXT_PUBLIC_SUPABASE_URL` | `/supabase` | Path relativo, proxied da Next.js |
| `SUPABASE_INTERNAL_URL` | `http://127.0.0.1:8000` | URL interno per route handlers |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `eyJ...` | ANON_KEY da supabase-project/.env |
| `ENTRA_INTERNAL_URL` | `http://127.0.0.1:8029` | Emulatore accessibile dall'host |
| `NEXT_PUBLIC_ELYSIA_WS_PORT` | `8090` (default) | Porta WebSocket per Elysia backend |

### Supabase (`supabase-project/.env`)

| Variabile | Valore locale | Descrizione |
|-----------|--------------|-------------|
| `SITE_URL` | `http://localhost:3090` | URL frontend visto dagli utenti |
| `GOTRUE_EXTERNAL_AZURE_URL` | `http://host.docker.internal:8029/common` | Emulatore visto da GoTrue (dentro Docker) |
| `GOTRUE_EXTERNAL_AZURE_REDIRECT_URI` | `http://localhost:3090/supabase/auth/v1/callback` | Callback OAuth |

### LDAP Emulator (`ldap-emulator/.env`)

| Variabile | Valore locale | Descrizione |
|-----------|--------------|-------------|
| `ISSUER_URL` | `http://host.docker.internal:8029` | Base URL per JWT issuer |
| `ALLOW_DYNAMIC_REDIRECT_URI` | `true` | Accetta qualsiasi redirect URI in dev |

## 7. Troubleshooting

### "Cannot connect" al Supabase

Verifica che Docker Desktop sia attivo e i container siano running:
```bash
docker compose -f ~/athena/supabase-project/docker-compose.yml ps
```

### Login fallisce con redirect error

Verifica coerenza delle URL con lo script di verifica:
```bash
bash ~/athena/elysia-frontend/scripts/auth-config/verify-auth-config.sh
```

### WebSocket non si connette

Il frontend si connette direttamente al backend Elysia sulla porta 8090.
Verifica che il backend sia attivo oppure imposta `NEXT_PUBLIC_ELYSIA_WS_PORT` in `.env.local` se usi una porta diversa.

### host.docker.internal non risolve

Su macOS con Docker Desktop, `host.docker.internal` risolve automaticamente all'host.
Se usi Colima o altro runtime, potresti dover aggiungere manualmente l'host.

## 8. Passaggio a Entra ID reale (produzione)

Per usare Microsoft Entra ID reale anziché l'emulatore:

1. **Frontend** `.env.local`:
   ```
   NEXT_PUBLIC_AUTH_PROVIDER=entra
   AUTH_PROVIDER_MODE=entra
   ```

2. **Supabase** `.env`:
   ```
   GOTRUE_EXTERNAL_AZURE_CLIENT_ID=<APP_ID da Azure Portal>
   GOTRUE_EXTERNAL_AZURE_SECRET=<CLIENT_SECRET da Azure Portal>
   GOTRUE_EXTERNAL_AZURE_URL=https://login.microsoftonline.com/<TENANT_ID>/v2.0
   GOTRUE_EXTERNAL_AZURE_REDIRECT_URI=https://<TUO_DOMINIO>/supabase/auth/v1/callback
   ```

3. L'emulatore non serve: non avviare `ldap-emulator`.
