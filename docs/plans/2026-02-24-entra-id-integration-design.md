# Integrazione Microsoft Entra ID - Design

**Data**: 2026-02-24
**Stato**: Draft

## 1. Contesto

Athena usa Supabase Auth per l'autenticazione. Attualmente il sistema punta a un LDAP Emulator locale per lo sviluppo. L'obiettivo e' passare all'autenticazione reale tramite Microsoft Entra ID dell'organizzazione UNI.

### Stato attuale

| Componente | Valore |
|---|---|
| Auth provider frontend | `emulator` |
| Azure Client ID (Supabase) | `test-app-123` |
| Azure URL (Supabase) | `http://host.docker.internal:8029/common` (emulatore) |
| Redirect URI | `http://10.1.1.11:8000/auth/v1/callback` |
| SITE_URL | `http://10.1.1.11:8090` |

### Credenziali Entra ID (fornite da IT)

| Campo | Valore |
|---|---|
| Client ID | `0e981dc6-4299-4db9-89ae-e24317c1ae2b` |
| Tenant ID | `91ad05f9-162f-4479-ae96-5f29268cf128` |
| Client Secret | `<VEDI_ENV_FILE_SUL_SERVER>` |
| Account type | Single Tenant (solo directory UNI) |

### Infrastruttura di rete

| Host | IP | Note |
|---|---|---|
| `alcor.uni.com` | `10.1.1.50` / `10.1.1.11` | Server interno, Supabase su porta 8000 |
| `athena.uni.com` | `213.140.28.120` / `.121` (DNS pubblico) | Reverse proxy UNI, HTTPS con cert valido |
| DNS interno VPN | `10.30.1.10` | NON ha record per `athena.uni.com` |

Il reverse proxy su `athena.uni.com` e' configurato per girare `/auth/v1/callback` verso `alcor.uni.com:8000`.

### Vincolo critico

Microsoft Entra ID richiede **HTTPS** per le Redirect URI (unica eccezione: `http://localhost`).
Quindi `http://10.1.1.11:8000/auth/v1/callback` **non e' accettabile** come Redirect URI.
E' necessario passare da `https://athena.uni.com/auth/v1/callback`.

## 2. Accesso utenti

- Gli utenti accedono **solo da VPN**
- URL di accesso: `http://10.1.1.11:3090` (dev) oppure `http://10.1.1.11:8090` (static/produzione)
- Entrambe le porte saranno attive durante lo sviluppo

## 3. Flusso OAuth target

```
 RETE INTERNA (VPN)                          RETE ESTERNA
 ==================                          ==============

 1. Utente apre
    http://10.1.1.11:3090
    Clicca "Accedi con Microsoft"
         |
 2. Browser --> /supabase/auth/v1/authorize
    (Next.js proxy --> 10.1.1.11:8000)
    GoTrue genera URL di autorizzazione
         |
 3. Browser --> https://login.microsoftonline.com/{tenant}/...
    redirect_uri=https://athena.uni.com/auth/v1/callback
         |                                        |
         |                                 4. Utente si autentica
         |                                    su Microsoft
         |                                        |
         |                                 5. Microsoft redirect -->
         |                                    https://athena.uni.com
         |                                    /auth/v1/callback
         |                                    ?code=<azure_code>
         |                                        |
 6. Browser risolve athena.uni.com        <-------+
    (DNS interno o hosts)
    Raggiunge il reverse proxy (o nginx locale)
         |
 7. Proxy --> alcor.uni.com:8000/auth/v1/callback
    Kong --> GoTrue processa il code
    GoTrue scambia code con Microsoft per i token
         |
 8. GoTrue redirect -->
    http://10.1.1.11:3090/auth/callback?code=<supabase_code>
         |
 9. Frontend: exchangeCodeForSession(code)
    Sessione stabilita. Utente autenticato.
```

**Nota**: il `code` al passo 5 e' il codice di autorizzazione Azure. Il `code` al passo 8 e' un codice PKCE generato da Supabase GoTrue. Sono due codici diversi.

## 4. Opzioni per la risoluzione DNS del callback

Il browser dell'utente (in VPN) deve poter raggiungere `https://athena.uni.com` per il callback OAuth. Ci sono due opzioni.

### Opzione A: DNS interno --> reverse proxy pubblico

```
Browser VPN --> DNS interno (10.30.1.10)
             --> 213.140.28.120 (reverse proxy pubblico)
             --> alcor.uni.com:8000 (Supabase)
```

**Intervento richiesto a IT**: aggiungere nel DNS interno:
```
athena.uni.com  A  213.140.28.120
```

**Pro**:
- Nessuna infrastruttura da aggiungere
- Riusa il reverse proxy e il certificato SSL gia' esistenti
- Intervento minimo (un record DNS)

**Contro**:
- Hairpin NAT: il traffico VPN esce sulla rete pubblica e rientra
- Dipendenza dal reverse proxy pubblico per ogni login
- Potrebbe non funzionare se il firewall VPN blocca l'accesso agli IP pubblici UNI

**Quando sceglierla**: per andare in produzione velocemente, verificando prima che dalla VPN si raggiunga `213.140.28.120`.

### Opzione B: Nginx locale su alcor + DNS interno --> 10.1.1.11

```
Browser VPN --> DNS interno (10.30.1.10)
             --> 10.1.1.11:443 (nginx locale)
             --> 10.1.1.11:8000 (Supabase)
```

**Intervento richiesto a IT**:
1. Aggiungere nel DNS interno:
   ```
   athena.uni.com  A  10.1.1.11
   ```
2. Fornire i file del certificato SSL per `athena.uni.com` (certificato + chiave privata)

**Configurazione nginx su alcor.uni.com** (`/etc/nginx/sites-available/athena-callback`):

```nginx
server {
    listen 443 ssl;
    server_name athena.uni.com;

    ssl_certificate     /etc/nginx/ssl/athena.uni.com.crt;
    ssl_certificate_key /etc/nginx/ssl/athena.uni.com.key;

    # Solo il callback OAuth - tutto il resto e' gestito direttamente
    location /auth/v1/callback {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Blocca tutto il resto (opzionale, per sicurezza)
    location / {
        return 404;
    }
}
```

Comandi di attivazione:
```bash
# Su alcor.uni.com
sudo ln -s /etc/nginx/sites-available/athena-callback /etc/nginx/sites-enabled/
sudo nginx -t          # verifica configurazione
sudo systemctl reload nginx
```

**Pro**:
- Traffico resta interamente nella rete interna
- Nessun hairpin NAT, nessuna dipendenza dal proxy pubblico
- Performance migliore e maggiore affidabilita'

**Contro**:
- Serve il certificato SSL per `athena.uni.com` sul server interno
- Un componente in piu' da mantenere (nginx)
- La chiave privata del certificato sara' presente sulla macchina interna

**Quando sceglierla**: se si vuole indipendenza dal proxy pubblico e il certificato e' disponibile.

## 5. Configurazione Entra ID (portale Azure)

Accedere al portale Azure --> Microsoft Entra ID --> App registrations --> selezionare l'app `0e981dc6-4299-4db9-89ae-e24317c1ae2b`.

### 5.1 Redirect URI

In **Authentication** --> **Platform configurations**:
1. Cliccare **Add a platform** --> **Web**
2. Inserire Redirect URI: `https://athena.uni.com/auth/v1/callback`
3. Salvare

### 5.2 API Permissions

In **API permissions**, verificare che siano presenti (delegated):
- `openid` (Microsoft Graph)
- `profile` (Microsoft Graph)
- `email` (Microsoft Graph)

Se mancano: **Add a permission** --> **Microsoft Graph** --> **Delegated permissions** --> selezionare e salvare.

### 5.3 Token Configuration (opzionale)

In **Token configuration**, verificare che siano inclusi i claim:
- `email`
- `preferred_username`

Questi sono generalmente inclusi di default con gli scope `openid profile email`.

### 5.4 Verifica

In **Overview**, confermare:
- **Supported account types**: "Accounts in this organizational directory only (UNI only - Single tenant)"
- **Application (client) ID**: `0e981dc6-4299-4db9-89ae-e24317c1ae2b`
- **Directory (tenant) ID**: `91ad05f9-162f-4479-ae96-5f29268cf128`

## 6. Configurazione Supabase

### 6.1 File `.env` su alcor.uni.com (`supabase-project/.env`)

Modificare le seguenti variabili (le altre restano invariate):

```bash
# ---- URL ----
SITE_URL=http://10.1.1.11:3090
API_EXTERNAL_URL=http://10.1.1.11:8000

# ---- Redirect URLs consentite ----
ADDITIONAL_REDIRECT_URLS=http://10.1.1.11:3090/auth/callback,http://10.1.1.11:8090/auth/callback,https://athena.uni.com/auth/v1/callback

# ---- Azure / Entra ID (sostituisce i valori emulatore) ----
GOTRUE_EXTERNAL_AZURE_ENABLED=true
GOTRUE_EXTERNAL_AZURE_CLIENT_ID=0e981dc6-4299-4db9-89ae-e24317c1ae2b
GOTRUE_EXTERNAL_AZURE_SECRET=<VEDI_ENV_FILE_SUL_SERVER>
GOTRUE_EXTERNAL_AZURE_URL=https://login.microsoftonline.com/91ad05f9-162f-4479-ae96-5f29268cf128/v2.0
GOTRUE_EXTERNAL_AZURE_REDIRECT_URI=https://athena.uni.com/auth/v1/callback
```

### 6.2 Riavvio Supabase

```bash
cd supabase-project
docker compose down
docker compose up -d
```

### 6.3 Verifica GoTrue

```bash
# Verificare che GoTrue risponda e mostri Azure come provider abilitato
curl http://10.1.1.11:8000/auth/v1/settings | python3 -m json.tool | grep -A5 azure
```

Output atteso:
```json
"azure": {
    "enabled": true
}
```

## 7. Configurazione Frontend

### 7.1 File `.env.local` su alcor.uni.com (`elysia-frontend/.env.local`)

```bash
# ---- Auth Provider: Entra ID reale ----
NEXT_PUBLIC_AUTH_PROVIDER=entra
AUTH_PROVIDER_MODE=entra

# ---- URL pubblico dell'applicazione ----
NEXT_PUBLIC_APP_ORIGIN=http://10.1.1.11:3090

# ---- Supabase ----
NEXT_PUBLIC_SUPABASE_URL=/supabase
SUPABASE_INTERNAL_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chiave_anon_da_supabase-project/.env>

# ---- Cookie auth ----
NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME=sb-athena-auth-token

# ---- Backend Elysia ----
ELYSIA_INTERNAL_URL=http://127.0.0.1:8090
NEXT_PUBLIC_ELYSIA_WS_PORT=8090

# ---- Non servono piu' (erano per l'emulatore) ----
# ENTRA_EMULATOR_INTERNAL_HOST=  (rimuovere o commentare)
# NEXT_PUBLIC_ENTRA_EMULATOR_PUBLIC_BASE=  (rimuovere o commentare)
# ENTRA_INTERNAL_URL=  (rimuovere o commentare)
```

### 7.2 Riavvio Frontend

```bash
cd elysia-frontend
# Dev mode
npm run dev

# Oppure per static export
npm run build
```

### 7.3 Nota su NEXT_PUBLIC_APP_ORIGIN e porta 8090

Se si usa anche la porta 8090 (static export via FastAPI), il `NEXT_PUBLIC_APP_ORIGIN` sara' diverso.
In quel caso l'app costruisce il `redirectTo` OAuth con `:8090`, e Supabase lo validera' contro `ADDITIONAL_REDIRECT_URLS` (dove abbiamo incluso `http://10.1.1.11:8090/auth/callback`).

Per la modalita' static export, il `.env.local` usato per il build dovra' avere:
```bash
NEXT_PUBLIC_APP_ORIGIN=http://10.1.1.11:8090
```

## 8. Query al Directory Service (Microsoft Graph) - Problema e Soluzioni

### 8.1 Problema nel codice attuale

Il sync-profile (`app/api/auth/sync-profile/route.ts`, riga 49) chiama:
```typescript
const dirUser = await fetchDirectoryUser(user.email);
```

La funzione `fetchDirectoryUser` (`lib/directory/client.ts`, riga 21-23) accetta un parametro opzionale `accessToken`:
```typescript
export async function fetchDirectoryUser(
    userUpn: string,
    accessToken?: string,  // <-- MAI passato dal sync-profile!
)
```

In modalita' `bearer` (produzione), il client verifica:
```typescript
if (process.env.DIRECTORY_SERVICE_AUTH_MODE === "bearer" && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
}
```

**Risultato**: con `DIRECTORY_SERVICE_AUTH_MODE=bearer` e `DIRECTORY_SERVICE_URL=https://graph.microsoft.com`, la chiamata parte SENZA Authorization header → Microsoft Graph risponde **401 Unauthorized** → il sync fallisce silenziosamente → `job_title` e `department` restano null.

### 8.2 Secondo problema: permessi Graph API

Anche risolvendo il token mancante, l'endpoint usato e':
```
GET https://graph.microsoft.com/v1.0/users/{email}?$select=id,displayName,jobTitle,department,mail
```

L'endpoint `/v1.0/users/{email}` (query per email, non `/me`) richiede il permesso `User.Read.All` o `User.ReadBasic.All`. Gli scope OAuth attuali (`openid profile email`) non includono permessi Microsoft Graph.

### 8.3 Soluzione raccomandata: Client Credentials Flow

Usare il **client credentials grant** per ottenere un token app-level per Microsoft Graph. Questo approccio e' server-to-server, non dipende dalla sessione utente, e funziona in modo affidabile.

**Flusso:**
```
sync-profile (server-side)
     |
     +--> POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
     |    grant_type=client_credentials
     |    client_id=0e981dc6-4299-4db9-89ae-e24317c1ae2b
     |    client_secret=<YOUR_CLIENT_SECRET>
     |    scope=https://graph.microsoft.com/.default
     |
     +--> Riceve access_token (valido ~60 min)
     |
     +--> GET https://graph.microsoft.com/v1.0/users/{email}
          Authorization: Bearer {access_token}
          → Riceve: { id, displayName, jobTitle, department, mail }
```

**Prerequisiti in Entra ID:**
1. Portale Azure → App registrations → l'app `0e981dc6...`
2. API permissions → Add a permission → Microsoft Graph → **Application permissions**
3. Aggiungere: `User.Read.All` (tipo Application, NON Delegated)
4. Cliccare **Grant admin consent for UNI** (richiede un amministratore del tenant)

**Modifiche al codice (2 file):**

**Nuovo file: `lib/directory/graph-token.ts`**
```typescript
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getGraphAccessToken(): Promise<string | null> {
    // Riusa token se non scaduto (con 5 min di margine)
    if (cachedToken && cachedToken.expiresAt > Date.now() + 300_000) {
        return cachedToken.token;
    }

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
        console.warn("[GraphToken] AZURE_TENANT_ID/CLIENT_ID/SECRET not configured");
        return null;
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
    });

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    if (!res.ok) {
        console.error("[GraphToken] Token request failed:", res.status);
        return null;
    }

    const data = await res.json();
    cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };
    return cachedToken.token;
}
```

**Modifica: `app/api/auth/sync-profile/route.ts`** (riga 49)
```typescript
// Prima:
const dirUser = await fetchDirectoryUser(user.email);

// Dopo:
import { getGraphAccessToken } from "@/lib/directory/graph-token";
// ...
const accessToken = await getGraphAccessToken();
const dirUser = await fetchDirectoryUser(user.email, accessToken ?? undefined);
```

**Nuove variabili .env.local frontend:**
```bash
# Microsoft Graph API (per sync profili)
AZURE_TENANT_ID=91ad05f9-162f-4479-ae96-5f29268cf128
AZURE_CLIENT_ID=0e981dc6-4299-4db9-89ae-e24317c1ae2b
AZURE_CLIENT_SECRET=<VEDI_ENV_FILE_SUL_SERVER>
```

### 8.4 Piano di fallback se Graph API non funziona

Se la query a Microsoft Graph non funziona (permessi negati, problemi di rete, etc.), il login **non e' bloccato** grazie al design resiliente del sync-profile. L'utente accede normalmente ma `job_title` e `department` restano null.

In questo caso:
1. Il login funziona normalmente (Entra ID + Supabase)
2. Il profilo viene creato automaticamente dal trigger `handle_new_user`
3. `job_title` e `department` restano vuoti
4. Le `role_standard_instructions` non vengono trovate (nessun match dept/job)
5. L'utente puo' comunque usare l'app con istruzioni AI generiche

**Workaround manuale** (se Graph API non disponibile):
Un amministratore puo' impostare i campi direttamente via Supabase Studio:
```sql
UPDATE user_profiles
SET job_title = 'Technical Project Manager',
    department = 'IES'
WHERE id = '<uuid-dell-utente>';
```

### 8.5 Flusso di autenticazione - Codice esistente (nessuna modifica)

Il flusso OAuth non richiede modifiche. Il percorso Entra ID e' gia' implementato:

- `AuthContext.tsx`: quando `NEXT_PUBLIC_AUTH_PROVIDER=entra`, usa `supabase.auth.signInWithOAuth({ provider: 'azure' })` con PKCE
- `app/auth/callback/page.tsx`: gestisce il callback con `exchangeCodeForSession(code)`
- `middleware.ts`: valida la sessione sulle rotte protette
- `app/api/auth/authorize/route.ts`: restituisce 405 in modalita' non-emulatore (corretto)

## 9. Transizione dati: profili, org_units e role_standard_instructions

### 9.1 Stato attuale delle tabelle sul server

| Tabella | Contenuto | Collegamento |
|---|---|---|
| `auth.users` | Utenti fake creati dall'emulatore LDAP | UUID generati dall'emulatore |
| `user_profiles` | Profili fake con job_title/department di test | FK → auth.users(id) |
| `org_units` | Unita' organizzative (almeno "Default") | Referenziata da user_profiles |
| `role_standard_instructions` | 6 combinazioni dept/job con istruzioni AI | Match su department + job_title |

### 9.2 Cosa succede quando un utente reale fa login con Entra ID

1. **Supabase GoTrue** crea una NUOVA entry in `auth.users` con un UUID diverso da quelli dell'emulatore
2. Il **trigger `handle_new_user`** crea automaticamente un `user_profiles` con:
   - `id` = nuovo UUID (dall'auth Entra ID)
   - `app_role` = 'user'
   - `org_unit` = NULL
   - tutti gli altri campi ai valori default
3. Il **sync-profile** (se Graph API funziona) aggiorna `job_title` e `department`
4. Il profilo reale e quello fake **non si sovrappongono** perche' hanno UUID diversi

### 9.3 Strategia: coesistenza emulatore + Entra ID

**I dati fake possono restare.** Non c'e' conflitto perche':

- Gli utenti emulatore hanno UUID diversi dagli utenti Entra ID
- Le `org_units` sono condivise (non legate a utenti specifici)
- Le `role_standard_instructions` sono condivise (match su testo, non su UUID)

Questo permette di:
- Tenere attivo l'emulatore come fallback durante la transizione
- Tornare alla modalita' emulatore cambiando solo `.env` se necessario
- Testare in parallelo entrambi i flussi

### 9.4 org_units: verifica e allineamento

La tabella `org_units` attualmente contiene almeno l'entry "Default". Per gli utenti reali:

1. **Verificare** se le sigle nei `role_standard_instructions` (DGE, AFC, IES, CEM, DIT) corrispondono a unita' organizzative reali di UNI
2. **Se corrispondono**: creare le entry corrispondenti in `org_units`:
   ```sql
   INSERT INTO org_units (name, ai_identity_base) VALUES
   ('DGE', 'Contesto: Direzione Generale. ...'),
   ('AFC', 'Contesto: Amministrazione, Finanza e Controllo. ...'),
   ('IES', 'Contesto: Infrastrutture e Servizi. ...'),
   ('CEM', 'Contesto: Comunicazione e Coordinamento. ...'),
   ('DIT', 'Contesto: Trasformazione Digitale. ...')
   ON CONFLICT (name) DO NOTHING;
   ```
3. **Se non corrispondono**: aggiornare le sigle per riflettere i nomi reali dei dipartimenti UNI
4. **Assegnare** `org_unit` ai profili reali tramite Supabase Studio o via admin

### 9.5 role_standard_instructions: verifica dei valori reali

**Problema critico**: i campi `department` e `job_title` nella tabella devono corrispondere **esattamente** a cio' che Microsoft Graph restituisce per gli utenti reali.

Esempio: se un utente reale ha in Graph API:
```json
{
    "department": "Direzione Generale",
    "jobTitle": "Direttore Generale"
}
```

Ma nella tabella c'e':
```
department = 'DGE', job_title = 'Responsabile Direzione Generale'
```

→ **Nessun match** → l'utente non riceve istruzioni standard.

**Piano di verifica:**
1. Dopo il primo login con Entra ID, controllare in `user_profiles` i valori reali di `department` e `job_title` sincronizzati da Graph API:
   ```sql
   SELECT id, department, job_title FROM user_profiles
   WHERE department IS NOT NULL
   ORDER BY created_at DESC;
   ```
2. Confrontare con i valori nella tabella `role_standard_instructions`
3. Aggiornare `role_standard_instructions` per usare i valori esatti di Graph API:
   ```sql
   -- Esempio: se Graph API restituisce "Direzione Generale" invece di "DGE"
   UPDATE role_standard_instructions
   SET department = 'Direzione Generale',
       job_title = 'Direttore Generale'
   WHERE department = 'DGE'
     AND job_title = 'Responsabile Direzione Generale';
   ```
4. Aggiungere nuove combinazioni per ruoli non ancora presenti

### 9.6 Pulizia dati fake (da fare SOLO quando l'emulatore non serve piu')

Quando si e' certi che Entra ID funziona stabilmente:

```sql
-- 1. Identificare gli utenti emulatore (hanno email @contoso.com o simili)
SELECT id, email FROM auth.users
WHERE email LIKE '%@contoso%'
   OR email LIKE '%@example%'
   OR raw_user_meta_data->>'iss' LIKE '%host.docker.internal%';

-- 2. I profili vengono eliminati automaticamente (CASCADE sulla FK)
-- Basta eliminare gli utenti da auth.users
DELETE FROM auth.users WHERE id IN (
    SELECT id FROM auth.users
    WHERE email LIKE '%@contoso%'
);

-- 3. Le org_units e role_standard_instructions NON vanno eliminate
-- (sono dati di configurazione, non dati utente)
```

**ATTENZIONE**: non eliminare i dati fake finche' non si e' certi che:
- Il login Entra ID funziona per tutti gli utenti target
- Il sync dei profili da Graph API funziona
- Le role_standard_instructions matchano i valori reali
- Non serve piu' l'emulatore come fallback

### 9.7 Riepilogo azioni per la transizione dati

| Azione | Quando | Bloccante? |
|---|---|---|
| Tenere dati fake | Subito, non toccare nulla | No |
| Primo login Entra ID | Dopo configurazione (sezioni 5-7) | No |
| Verificare valori Graph API | Dopo primo login riuscito | No |
| Allineare role_standard_instructions | Dopo verifica valori reali | No (app funziona senza) |
| Popolare org_units reali | Quando si conoscono le unita' | No (app funziona senza) |
| Assegnare org_unit ai profili | Dopo popolamento org_units | No |
| Eliminare dati fake | Solo quando emulatore non serve piu' | No |

## 10. Checklist di verifica

### Pre-requisiti (rete/infrastruttura)
- [ ] DNS interno: `athena.uni.com` risolve (Opzione A: verso `213.140.28.120`, Opzione B: verso `10.1.1.11`)
- [ ] Da VPN: `curl -I https://athena.uni.com/auth/v1/callback` risponde (302 o 400, non connection refused)

### Entra ID (portale Azure)
- [ ] Redirect URI `https://athena.uni.com/auth/v1/callback` registrata (piattaforma Web)
- [ ] API permissions delegated: `openid`, `profile`, `email` presenti
- [ ] API permissions application: `User.Read.All` aggiunta (per Graph API)
- [ ] Admin consent concesso per `User.Read.All`

### Supabase
- [ ] `.env` aggiornato con credenziali Entra ID reali
- [ ] `docker compose down && docker compose up -d` eseguito
- [ ] `curl http://10.1.1.11:8000/auth/v1/settings` mostra `azure.enabled: true`

### Frontend
- [ ] `.env.local` aggiornato con `NEXT_PUBLIC_AUTH_PROVIDER=entra`
- [ ] `.env.local` contiene `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- [ ] `.env.local` contiene `DIRECTORY_SERVICE_URL=https://graph.microsoft.com`
- [ ] `.env.local` contiene `DIRECTORY_SERVICE_AUTH_MODE=bearer`
- [ ] Codice `graph-token.ts` creato e `sync-profile/route.ts` aggiornato
- [ ] Frontend riavviato
- [ ] Pagina di login mostra "Accedi con Microsoft"

### Test end-to-end (autenticazione)
- [ ] Click su "Accedi con Microsoft" --> redirect a `login.microsoftonline.com`
- [ ] Login con credenziali UNI --> redirect a `https://athena.uni.com/auth/v1/callback`
- [ ] Callback processato --> redirect a `http://10.1.1.11:3090/auth/callback`
- [ ] Sessione stabilita --> utente autenticato nell'app

### Test end-to-end (profili)
- [ ] Dopo login, `user_profiles` contiene l'entry con UUID reale
- [ ] `job_title` e `department` sono popolati (non null)
- [ ] Valori `department` e `job_title` verificati contro `role_standard_instructions`
- [ ] Se mismatch: `role_standard_instructions` aggiornata con valori reali

### Test transizione dati
- [ ] Dati fake ancora presenti e non interferiscono
- [ ] Emulatore ancora funzionante come fallback (se necessario)
- [ ] Nuovi utenti Entra ID hanno profili separati dai fake

### Solo Opzione B (nginx locale)
- [ ] Certificato SSL installato su alcor.uni.com
- [ ] `sudo nginx -t` passa senza errori
- [ ] `curl -I https://athena.uni.com/auth/v1/callback` da alcor.uni.com risponde

## 11. Troubleshooting

### "401 Unauthorized" da Microsoft Graph API (sync profili)
Il token per Graph API non funziona. Verificare:
1. `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` nel `.env.local` sono corretti
2. Il permesso `User.Read.All` (Application) e' stato aggiunto nell'app registration
3. L'admin consent e' stato concesso (icona verde nel portale Azure)
4. Il file `lib/directory/graph-token.ts` e' stato creato e importato in sync-profile

Test manuale del token:
```bash
curl -X POST "https://login.microsoftonline.com/91ad05f9-162f-4479-ae96-5f29268cf128/oauth2/v2.0/token" \
  -d "grant_type=client_credentials" \
  -d "client_id=0e981dc6-4299-4db9-89ae-e24317c1ae2b" \
  -d "client_secret=<VEDI_ENV_FILE_SUL_SERVER>" \
  -d "scope=https://graph.microsoft.com/.default"
```
Se restituisce un `access_token`, il problema e' nel codice. Se restituisce un errore, il problema e' nella configurazione Entra ID.

### "AADSTS50011: The redirect URI specified in the request does not match"
La Redirect URI in Entra ID non corrisponde a quella inviata da GoTrue. Verificare che `GOTRUE_EXTERNAL_AZURE_REDIRECT_URI` nel `.env` Supabase corrisponda **esattamente** a quella registrata nel portale Entra ID (incluso protocollo, dominio, path, senza trailing slash).

### "Could not resolve host: athena.uni.com" nel browser
Il DNS interno non ha ancora il record. Workaround temporaneo: aggiungere al `/etc/hosts` del client:
- Opzione A: `213.140.28.120  athena.uni.com`
- Opzione B: `10.1.1.11  athena.uni.com`

### Il callback arriva a Supabase ma redirect fallisce
Verificare `SITE_URL` e `ADDITIONAL_REDIRECT_URLS` nel `.env` Supabase. L'URL a cui GoTrue tenta di redirigere (`http://10.1.1.11:3090/auth/callback`) deve essere presente nella lista.

### Login funziona ma il profilo utente e' vuoto
Il sync-profile (`/api/auth/sync-profile`) tenta di chiamare il Directory Service (Microsoft Graph). Se `DIRECTORY_SERVICE_URL` non e' configurato, il sync viene saltato silenziosamente. Questo non blocca il login ma il profilo (jobTitle, department) restera' vuoto.

### "Invalid PKCE verifier" o sessione non stabilita
Possibile mismatch di dominio/cookie. Verificare che il browser torni allo stesso dominio (`10.1.1.11:3090`) da cui e' partito il flusso OAuth. Se il `NEXT_PUBLIC_APP_ORIGIN` non corrisponde, il cookie PKCE non sara' presente.

### GoTrue risponde ma azure non e' tra i provider
Il container Supabase Auth potrebbe avere una cache della configurazione. Fare `docker compose down && docker compose up -d` (non solo restart) per forzare il reload completo.
