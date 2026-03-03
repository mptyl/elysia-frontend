# Analisi discrepanze Mac ↔ Produzione (10.1.1.11)
## Integrazione Athena-ThothAI e gestione autenticazione

> **Documento di riferimento** — prodotto il 2026-03-02 tramite analisi SSH diretta
> del server (`/opt/athena/`) e ispezione della codebase locale.
> Non richiede azioni immediate. Consultare prima del prossimo ciclo di sviluppo.
>
> **Conclusione principale**: Non esistono patch nascoste né divergenze di codice
> applicativo tra Mac e server. L'integrazione funziona in produzione perché tutto
> il codice rilevante è correttamente committato e sincronizzato via GitHub.
> Le 3 discrepanze trovate sono minori e documentate nella Sezione 3.
>
> **Percorso di questo file**: `/Users/mp/.claude/plans/robust-mapping-llama.md`
> Copiare in `supabase-project/docs/mac-server-sync-analysis-2026-03-02.md`
> per conservazione permanente nel progetto.

---

## SEZIONE 1 — ARCHITETTURA DELL'INTEGRAZIONE (baseline di riferimento)

### Stack completo (produzione)

```
Browser
  │
  ├─► Athena (elysia-frontend) — porta 8090 (prod) / 3090 (dev)
  │     Next.js SPA, auth Supabase+Entra, sidebar con link ThothAI
  │     Rewrites verso Supabase (:8000), Elysia backend (:8090), Entra emulator
  │
  └─► ThothAI proxy nginx (thoth-proxy) — porta 8040
        │
        ├─ /admin, /api, /vdb, /ajax  →  thoth-backend Django (:8000)
        ├─ /auth/admin-callback       →  Django (con override next=/ [PATCH#1])
        ├─ /api/config                →  thoth-frontend Next.js (:3000)  [PATCH#2]
        ├─ /api/sql-proxy             →  thoth-frontend Next.js (:3000)
        ├─ /*  (frontend pages)       →  thoth-frontend Next.js (:3000)
        │       + sub_filter nginx    →  inietta script in </head>     [PATCH#3]
        │
        ├─ thoth-frontend Next.js (:3000)
        │     app/auth/supabase/page.tsx  — riceve token Supabase via postMessage
        │     app/api/supabase-auth/      — proxy verso Django /api/supabase-auth
        │     app/api/config/             — espone athenaOrigins runtime
        │
        └─ thoth-backend Django (:8000)
              /api/supabase-auth  — scambia JWT Supabase → token DRF
              GoTrue validation   — connessione a supabase_default network
```

### Flusso SSO Athena → ThothAI (step by step)

```
1. Utente loggato in Athena clicca "ThothAI" nel sidebar
2. Athena apre popup: ${THOTH_URL}/auth/supabase?athena_origin=${origin}
3. ThothAI /auth/supabase si carica, chiama GET /api/config (athenaOrigins)
   → nginx sub_filter intercetta, injetta valore da localStorage se presente
4. ThothAI postMessage('ready', '*') → window.opener (Athena)
5. Athena riceve 'ready', postMessage({type:'supabase_token', token}, thothUrl)
   → validato contro athenaOrigins[] (origine verificata)
6. ThothAI /auth/supabase → POST /api/supabase-auth (proxy Next.js)
7. Next.js route → POST Django /api/supabase-auth (via DJANGO_SERVER)
8. Django valida JWT con GoTrue (supabase-auth:9999), provvede utente, ritorna DRF token
9. ThothAI salva token in localStorage, redirect a /chat
```

### Patch nginx critiche (thoth-config/nginx-default.conf.tpl)

| ID | Location | Cosa fa |
|----|----------|---------|
| PATCH#1 | `/auth/admin-callback` | Override `next=/admin/` → `next=/` per evitare loop SSO Django admin |
| PATCH#2 | `/api/config` | Routing al frontend Next.js (non a Django) per expose athenaOrigins |
| PATCH#3 | `location /` sub_filter | Inietta script JS in `</head>` per: (a) salvare athena_origin da ?param in localStorage, (b) monkey-patch fetch per override athenaOrigin in /api/config, (c) patchare link "Athena" per fare `window.opener.focus()+window.close()` anziché nuova tab |

---

## SEZIONE 2 — STATO CORRENTE: MAC vs SERVER

### Nota: SSH configurato e verificato
Server raggiungibile via `ssh athena` (chiave `~/.ssh/id_rsa`, host alias in `~/.ssh/config`).
Path progetto sul server: `/opt/athena/` (non `~/AthenaAI/`).

### 2.1 Repository `elysia-frontend`

| Aspetto | Mac (locale) | Server (10.1.1.11) | Stato |
|---------|-------------|-------------------|-------|
| Branch | `main` | `main` (confermato dall'utente) | ✅ Allineati |
| Commit HEAD | `f726619` (theme toggle) | `13cd9ea` (doc firewall) | ❌ SERVER 2 COMMIT AVANTI |
| Working tree | CLEAN | CLEAN | ✅ |
| Tracking | Up to date con `origin/main` | **2 commit ahead, non pushati** | ❌ DIVERGENZA CRITICA |
| `.env.local` | emulator mode, `localhost` URLs | emulator mode, IP `10.1.1.11` per Supabase e Thoth | ✅ Differenza attesa |

**I 2 commit sul server NON presenti sul Mac (non ancora pushati a GitHub):**
```
13cd9ea  aggiunto doc su firewall
           → docs/firewall-setup.md (nuovo, 44 righe)

83909bb  feat: add local environment setup example and UNI corporate theme definition
           → config/env/.env.local-setup.example (nuovo, 95 righe — template dettagliato .env.local)
           → docs/Tema-UNI.json (nuovo, 1 riga — tema Power BI UNI Corporate)
```

**Questi file sono documentazione pura (nessun codice applicativo).**
Il `.env.local-setup.example` è particolarmente utile: contiene istruzioni inline
per passare tra modalità emulator e Entra ID, con checklist completa.

**Commit rilevanti per l'integrazione (già su Mac):**
```
f726619  feat(theme): add light/dark theme toggle
75ea43b  rebrand: Athena logos
4e52ce0  fix(sidebar): passa ?athena_origin= a ThothAI, riusa tab  ← CRITICO
c33062c  docs(config): auth-switch env section
aeab4fa  Merge feature/thothai-integration into main
0a33db6  fix(auth): set browser session before navigating (implicit flow)
ba3f218  feat(auth): AuthProvider in layout, useAuth() in ThothAI sidebar
```

**File critici integrazione in elysia-frontend:**
- `app/components/navigation/SidebarComponent.tsx` — handleThothAIClick, postMessage handshake
- `app/components/contexts/AuthContext.tsx` — useAuth(), session.access_token
- `middleware.ts` — protezione server-side delle route
- `app/api/auth/authorize/route.ts` — proxy OAuth emulator
- `next.config.js` — rewrites `/supabase/*`, `/entra/*`, `/n8n/*`

### 2.2 Repository `supabase-project`

| Aspetto | Mac (locale) | Server (10.1.1.11) | Stato |
|---------|-------------|-------------------|-------|
| Branch | `master` | `master` (confermato) | ✅ Allineati |
| Commit HEAD | `a74dfb4` (merge master) | `a74dfb4` (merge master) | ✅ Identici |
| Working tree | **1 modifica non committata** | CLEAN | ❌ Mac ha change locale |
| Untracked files | `technical-debts/`, `volumes/snippets/` | — | ❌ Mac ha file non tracciati |

**Modifica non committata su Mac:**
```diff
# docker-compose.thoth.yml
+name: supabase-athena
+
 services:
```
Questa aggiunge il project name esplicito, che cambia il prefisso dei volumi
Docker da `supabase-project_thoth-*` a `supabase-athena_thoth-*`.

**⚠️ RISCHIO CRITICO**: Se applicata sul server senza prima ancorare i volumi
con `name:` espliciti, i container ThothAI non troverebbero più i volumi
esistenti (dati persi). Vedere Tech Debt #1.

### 2.3 File di configurazione non versionati

#### `thoth-config/.env.thoth` — GITIGNORED

| Variabile | Mac | Server | Note |
|-----------|-----|--------|------|
| `THOTH_PUBLIC_HOST` | `localhost` | `10.1.1.11` | ✅ Differenza attesa |
| `SERVER_NAME` | `localhost` | `localhost` | ✅ Identico |
| `ALLOWED_HOSTS` | `thoth-proxy,thoth-backend` | `thoth-proxy,thoth-backend,10.1.1.11` | ✅ Differenza attesa |
| `NEXT_PUBLIC_ATHENA_ORIGIN` | `http://localhost:3090` | `http://localhost:8090` | ✅ Differenza attesa |
| `RUNTIME_ATHENA_ORIGINS` | `http://localhost:3090,http://localhost:8090` | `http://10.1.1.11:3090,http://10.1.1.11:8090` | ✅ Differenza attesa |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3090,http://localhost:8090,http://localhost:8040` | include entrambi localhost e IP | ⚠️ Mac manca origini IP (non serve in locale) |
| `SUPABASE_AUTH_ENABLED` | `true` | `true` | ✅ Uguale |
| `SUPABASE_AUTH_URL` | `http://supabase-auth:9999` | `http://supabase-auth:9999` | ✅ Uguale |
| `RUNTIME_ATHENA_ORIGIN` | presente | **assente** sul server | ⚠️ Mac ha variabile extra (non blocca) |

**Il `.env.thoth` sul Mac è corretto per locale. Il server ha un formato leggermente più ricco
(con commenti estesi) ma i valori funzionali sono corretti in entrambi.**

#### `elysia-frontend/.env.local` — GITIGNORED — DIFFERENZA STRUTTURALE

Il server ha un `.env.local` con **formato completamente diverso e molto più ricco**,
creato come best practice (commit `83909bb` tramite `.env.local-setup.example`):

| Variabile | Mac | Server | Stato |
|-----------|-----|--------|-------|
| `NEXT_PUBLIC_AUTH_PROVIDER` | `emulator` | `emulator` | ✅ Uguale |
| `NEXT_PUBLIC_SUPABASE_URL` | `http://localhost:8000` | `http://10.1.1.11:8000` | ✅ Differenza attesa |
| `NEXT_PUBLIC_THOTH_URL` | `http://localhost:3040` | `http://10.1.1.11:8040` (via proxy) | ✅ Differenza attesa |
| `ENTRA_EMULATOR_INTERNAL_HOST` | `http://host.docker.internal:8029` | `http://host.docker.internal:8029` | ✅ Uguale |
| Istruzioni inline switch emulator↔entra | Assenti | **Presenti** (45 righe di commento) | ⚠️ Mac manca documentazione |

**L'azione raccomandata sul Mac**: aggiornare `.env.local` al formato del server
(usando `config/env/.env.local-setup.example` come riferimento) mantenendo i valori `localhost`.

### 2.4 Docker containers — confronto Mac vs Server

| Container | Server (status) | Mac (status) |
|-----------|----------------|--------------|
| `thoth-backend` | Up 28h ✅ healthy | In esecuzione (avviato oggi) |
| `thoth-frontend` | Up 28h ✅ healthy, 3040→3000 | Rebuild oggi, 3040→3000 |
| `thoth-proxy` | Up 28h ✅ healthy, **8040→80** | In esecuzione |
| `thoth-sql-generator` | Up 29h, 8020→8001 | In esecuzione |
| `thoth-qdrant` | Up 46h, 6333 | In esecuzione |
| `thoth-mermaid-service` | Up 33h **⚠️ UNHEALTHY** | In esecuzione |
| Supabase stack | Up 2 days ✅ | In esecuzione |
| `entra-emulator` | Up 2 days ✅ healthy, 8029 | In esecuzione |
| `weaviate` | Up 10 days, 8080/50051 | In esecuzione |
| `n8n` | Up 6 days, 5678 | In esecuzione |

**Nota sul server**: `thoth-mermaid-service` è in stato UNHEALTHY — da investigare separatamente.
**Nota sul Mac**: Il container `thoth-proxy` deve avere la config nginx aggiornata (sub_filter).
Verifica: `curl -s http://localhost:8040/chat | grep -o 'thoth_athena_origin'`

---

## SEZIONE 3 — DISCREPANZE IDENTIFICATE E PRIORITÀ

### ✅ NON CI SONO PATCH NASCOSTE SUL SERVER

Verifica completata via SSH: il server **non ha modifiche locali non committate** né in
`elysia-frontend` né in `supabase-project`. Tutto il codice funzionante in produzione
è già committato e pushato (o in attesa di push per i 2 doc commits).

---

### ❌ CRITICHE (bloccano la parità Mac-server)

#### D1: elysia-frontend sul server ha 2 commit non pushati a GitHub
- **Causa**: Commits creati direttamente sul server, mai pushati a `origin/main`.
- **Effetto**: Il Mac non ha questi file (solo documentazione, non codice):
  - `config/env/.env.local-setup.example` — template `.env.local` con istruzioni inline
  - `docs/Tema-UNI.json` — tema Power BI
  - `docs/firewall-setup.md` — documentazione firewall
- **Fix**: Pushare dal server, poi `git pull` sul Mac.
  ```bash
  # Sul server:
  ssh athena "cd /opt/athena/elysia-frontend && git push origin main"
  # Sul Mac:
  git pull  # (in elysia-frontend)
  ```

#### D2: `.env.local` sul Mac non ha il nuovo formato documentato
- **Causa**: Il server ha un `.env.local` ricco di istruzioni inline (basato su
  `config/env/.env.local-setup.example`), il Mac ha il vecchio formato minimale.
- **Effetto**: Non blocca il funzionamento, ma il Mac manca delle istruzioni per
  passare tra modalità emulator ↔ entra.
- **Fix**: Aggiornare `.env.local` sul Mac usando `.env.local-setup.example`
  come template (dopo il pull del punto D1), mantenendo i valori `localhost`.

### ⚠️ OPERATIVE (causano asimmetria Mac/server)

#### D3: `name: supabase-athena` non committato in supabase-project
- **Mac**: Aggiunta locale non committata in `docker-compose.thoth.yml`
- **Server**: Non ha `name:` → usa `supabase-project` come project name Docker
- **Rischio**: Deploy crociato Mac↔Server rompe i volumi se non gestito
- **Fix**: Committare + applicare sul server con cautela (vedere Tech Debt #1)

#### D4: `technical-debts/` e `volumes/snippets/` non tracciati
- **Stato Mac**: Due path untracked in `supabase-project`
- **Fix**: Committare `technical-debts/tech-debts.md`, ignorare `volumes/snippets/`

#### D5: Stato del server non verificabile senza SSH
- **Non è possibile** determinare se il server ha modifiche non pushate in
  `elysia-frontend` o `supabase-project`
- **Rischio**: Il server potrebbe avere patch locali non committate che
  divergono dal codice Mac
- **Fix**: Abilitare accesso SSH dalla CLI o accedere al server manualmente

### ℹ️ ATTESE (non richiedono azioni)

| ID | Tipo | Dettaglio |
|----|------|-----------|
| D6 | Env `.env.thoth` | Valori IP diversi (localhost vs 10.1.1.11) |
| D7 | Env `.env.local` | Auth mode emulator (Mac) vs entra (server) |
| D8 | Porte | 3090 dev port (Mac) vs 8090 prod port (server) |
| D9 | Docker volume prefix | `supabase-athena_` (Mac) vs `supabase-project_` (server) |

---

## SEZIONE 4 — PIANO DI ALLINEAMENTO MAC → PRODUZIONE

### STEP 1 — Push dei commit mancanti dal server

```bash
# Dal Mac: push del server verso GitHub
ssh athena "cd /opt/athena/elysia-frontend && git push origin main"

# Poi pull sul Mac
cd /Users/mp/AthenaAI/elysia-frontend
git pull origin main
# Atteso: 3 nuovi file (firewall-setup.md, .env.local-setup.example, Tema-UNI.json)
```

### STEP 2 — Aggiornare `.env.local` sul Mac

Dopo il pull, usare il nuovo template come riferimento:
```bash
# Confronta il template con il .env.local attuale
diff /Users/mp/AthenaAI/elysia-frontend/config/env/.env.local-setup.example \
     /Users/mp/AthenaAI/elysia-frontend/.env.local
```

Aggiornare `.env.local` al formato documentato, mantenendo i valori localhost:
- `NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000` (non l'IP del server)
- `NEXT_PUBLIC_THOTH_URL=http://localhost:3040` (non http://10.1.1.11:8040)
- `NEXT_PUBLIC_AUTH_PROVIDER=emulator` (invariato)

### STEP 3 — Commit pending in supabase-project

```bash
cd /Users/mp/AthenaAI/supabase-project

# 3a. Committare technical-debts/tech-debts.md
git add technical-debts/tech-debts.md

# 3b. Committare docker-compose.thoth.yml (name: supabase-athena)
# ⚠️ NON applicare sul server senza prima risolvere Tech Debt #1
git add docker-compose.thoth.yml

git commit -m "fix(docker): add project name supabase-athena + tech-debt docs

- docker-compose.thoth.yml: 'name: supabase-athena' per naming coerente
- technical-debts/tech-debts.md: documenta rischio volume prefix asimmetria

⚠️ PRODUCTION: applicare sul server solo dopo anchoring volume names
   (vedere technical-debts/tech-debts.md per la procedura)"

git push origin master
```

### STEP 4 — Verifica containers Mac

```bash
# 4a. Sub_filter nginx attivo?
curl -s http://localhost:8040/chat | grep -o 'thoth_athena_origin'
# Atteso: "thoth_athena_origin"

# 4b. Route /auth/supabase (già verificata: 200)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3040/auth/supabase

# 4c. Config endpoint
curl -s http://localhost:8040/api/config | python3 -m json.tool
# Atteso: athenaOrigins: ["http://localhost:3090", "http://localhost:8090"]
```

Se 4a fallisce → ricreare thoth-proxy:
```bash
cd /Users/mp/AthenaAI/supabase-project
docker compose --env-file ./thoth-config/.env.thoth \
  -f docker-compose.thoth.yml up -d --force-recreate thoth-proxy
```

### STEP 5 — Verificare Tech Debt #1 sul server (volume names)

Prima del prossimo deploy in produzione:
```bash
ssh athena "cd /opt/athena/supabase-project && git pull origin master"
# Poi eseguire la procedura di anchoring volumi descritta in technical-debts/tech-debts.md
# SOLO DOPO applicare: docker compose -f docker-compose.thoth.yml up -d --force-recreate
```

### STEP 6 — Test end-to-end integrazione Athena→ThothAI

Procedura di verifica completa:
```
1. Apri http://localhost:3090 (Athena dev) o http://localhost:8090 (Athena prod)
2. Login con emulator (demo@uni.local / demo123) o Entra
3. Clicca "ThothAI" nel sidebar sinistro
   → Deve aprirsi un tab su http://localhost:3040/auth/supabase
   → Il tab deve mostrare "Autenticazione in corso..."
   → Dopo 2-3s deve redirectare a /chat
4. In ThothAI, hover sul link "Athena" nel sidebar
   → Deve puntare all'origin da cui sei venuto
5. Clicca "Athena" → deve tornare al tab Athena (window.opener.focus())
6. Clicca di nuovo "ThothAI" in Athena → deve riusare il tab esistente (focus)
```

---

## SEZIONE 5 — CHECKLIST TECH DEBTS DA RISOLVERE

### Tech Debt #1 (ALTA PRIORITÀ prima di deploy su server)
**Volume name anchoring in docker-compose.thoth.yml**

Prima di applicare `name: supabase-athena` sul server, aggiungere al compose:
```yaml
volumes:
  thoth-backend-db:
    name: supabase-project_thoth-backend-db
  thoth-shared-data:
    name: supabase-project_thoth-shared-data
  thoth-logs:
    name: supabase-project_thoth-logs
  thoth-secrets:
    name: supabase-project_thoth-secrets
  thoth-backend-static:
    name: supabase-project_thoth-backend-static
  thoth-backend-media:
    name: supabase-project_thoth-backend-media
  thoth-qdrant-data:
    name: supabase-project_thoth-qdrant-data
```

### Tech Debt #2 (MEDIA — già documentato)
**Dual codebase ThothAI frontend** (ThothAI/frontend/ vs thoth_ui/)
→ Vedere `ThothAI/technical_debts/frontend-dual-codebase.md`

### Tech Debt #3 (BASSA)
**SSH access da CLI Mac verso server**
→ Configurare chiave SSH per permettere verifiche automatizzate dello stato server

---

## SEZIONE 6 — FILE CRITICI DA MONITORARE

### elysia-frontend
| File | Ruolo | Ultima modifica |
|------|-------|-----------------|
| `app/components/navigation/SidebarComponent.tsx` | handleThothAIClick, postMessage | commit `4e52ce0` |
| `app/components/contexts/AuthContext.tsx` | useAuth(), session.access_token | commit `ba3f218` |
| `middleware.ts` | Route protection | — |
| `app/api/auth/authorize/route.ts` | OAuth emulator proxy | — |
| `next.config.js` | Rewrites (supabase, entra, n8n) | — |
| `.env.local` | Auth mode, URLs (GITIGNORED) | Manuale |

### supabase-project
| File | Ruolo | Ultima modifica |
|------|-------|-----------------|
| `docker-compose.thoth.yml` | Stack ThothAI | Uncommitted (`name:`) |
| `thoth-config/nginx-default.conf.tpl` | Proxy rules + PATCH#1/2/3 | commit `51970a6` |
| `thoth-config/.env.thoth` | Variabili runtime ThothAI (GITIGNORED) | Manuale |

---

## SEZIONE 7 — COSA FARE SUBITO (ordinato per priorità)

1. **[IMMEDIATO]** Push 2 commit da server a GitHub:
   `ssh athena "cd /opt/athena/elysia-frontend && git push origin main"`
2. **[IMMEDIATO]** Pull sul Mac: `git pull` in `elysia-frontend`
3. **[IMMEDIATO]** Aggiornare `elysia-frontend/.env.local` al nuovo formato
4. **[OGGI]** Committare in `supabase-project`: `technical-debts/` + `docker-compose.thoth.yml` + push
5. **[OGGI]** Verificare sub_filter nginx sul Mac: `curl -s http://localhost:8040/chat | grep thoth_athena_origin`
6. **[OGGI]** Test end-to-end: ThothAI da Athena, SSO completo
7. **[PRESTO]** Sul server: risolvere Tech Debt #1 (volume names) prima del prossimo deploy
8. **[FUTURO]** Consolidare dual codebase ThothAI (Tech Debt #2)
9. **[FUTURO]** Investigare `thoth-mermaid-service` UNHEALTHY sul server
