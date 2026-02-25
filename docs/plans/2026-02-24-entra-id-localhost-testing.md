# Configurazione per Testare Entra ID (UNI) da Localhost

**Obiettivo:** Permettere a un ambiente di sviluppo locale (es. il tuo Mac) di autenticarsi utilizzando il vero tenant Microsoft Entra ID di UNI, bypassando l'emulatore Entra ID locale.

Questo documento descrive i passaggi necessari sia lato sistemistico (Azure Portal) che lato sviluppatore (file `.env` locali).

---

## 1. Azioni richieste agli Amministratori IT UNI (Azure Portal)

Il flusso OAuth 2.0 blocca per sicurezza qualsiasi redirect verso URL non esplicitamente autorizzati ("whitelisted"). Per far funzionare il login dal tuo computer, gli amministratori Azure devono aggiungere gli URL di localhost alla App Registration.

**Richiesta da inviare all'IT:**
> "Per poter testare l'integrazione SSO dal mio ambiente di sviluppo locale connesso in VPN, vi chiedo gentilmente di aggiungere i seguenti URL alla lista delle **Redirect URI (Web)** nell'App Registration di Athena su Entra ID:"
>
> 1. `http://localhost:8000/auth/v1/callback` *(Usato internamente dal Supabase locale)*
> 2. `http://127.0.0.1:8000/auth/v1/callback` *(Alternativa sicura)*

*Nota: Microsoft Entra ID consente esplicitamente l'uso di `http://localhost` per le Redirect URI a scopo di sviluppo, disattivando temporaneamente l'obbligo di HTTPS.*

---

## 2. Azioni per lo Sviluppatore (Configurazione Locale)

Una volta che gli URL di localhost sono stati approvati su Azure e hai a disposizione le credenziali dell'App (Tenant ID, Client ID, Client Secret), devi aggiornare la configurazione locale.

### A. Configurare Supabase Auth (Il servizio GoTrue locale)

Devi modificare il file `.env` che controlla l'istanza Docker locale di Supabase (tipicamente nella cartella root del progetto Supabase o dove lanci `docker compose`).

**Commenta la configurazione dell'emulatore e inserisci quella di Produzione:**

```bash
# --- Configurazione SSO Supabase ---

# 1. DISABILITA L'EMULATORE LOCALE (Commenta queste righe)
# GOTRUE_EXTERNAL_AZURE_URL=http://host.docker.internal:8029/common
# GOTRUE_EXTERNAL_AZURE_CLIENT_ID=test-app-123
# GOTRUE_EXTERNAL_AZURE_SECRET=test-secret

# 2. ABILITA IL VERO ENTRA ID DI UNI (De-commenta e compila)
GOTRUE_EXTERNAL_AZURE_ENABLED=true
GOTRUE_EXTERNAL_AZURE_URL=https://login.microsoftonline.com/<INSERISCI_IL_TENANT_ID_UNI>/v2.0
GOTRUE_EXTERNAL_AZURE_CLIENT_ID=<INSERISCI_IL_CLIENT_ID>
GOTRUE_EXTERNAL_AZURE_SECRET=<INSERISCI_IL_CLIENT_SECRET>
GOTRUE_EXTERNAL_AZURE_REDIRECT_URI=http://localhost:8000/auth/v1/callback
```

*Importante: Dopo aver modificato questo file, devi riavviare i container Supabase affinché GoTrue legga le nuove variabili (es. `docker compose down && docker compose up -d`).*

### B. Configurare Elysia Frontend (Per il sync del profilo via Graph API)

Per testare anche la sincronizzazione del profilo utente (recupero qualifica e dipartimento tramite Microsoft Graph API), devi fornire al backend Node.js (Elysia) le stesse credenziali.

Modifica il file `elysia-frontend/.env.local`:

```bash
# --- Configurazione Elysia API ---

# Credenziali App per ottenere il token Microsoft Graph (Client Credentials Flow)
AZURE_TENANT_ID=<INSERISCI_IL_TENANT_ID_UNI>
AZURE_CLIENT_ID=<INSERISCI_IL_CLIENT_ID>
AZURE_CLIENT_SECRET=<INSERISCI_IL_CLIENT_SECRET>

# Forza Elysia a usare Graph API reale passando l'header Bearer
DIRECTORY_SERVICE_AUTH_MODE=bearer
```

---

## 3. Flusso di Test

1. Assicurati di essere **connesso alla VPN** aziendale di UNI (se richiesto per policy di conditional access applicate al tuo account).
2. Riavvia Supabase: `docker compose down && docker compose up -d`
3. Avvia il frontend Elysia: `npm run dev` (sulla porta 8090 o quella configurata).
4. Vai su `http://localhost:8090`, clicca su Login.
5. Dovresti essere reindirizzato direttamente alla pagina di login ufficiale di Microsoft (`login.microsoftonline.com`).
6. Se il login ha successo e la redirect URI è configurata correttamente su Azure, verrai riportato in `localhost` come utente autenticato.
7. Il webhook/API route `sync-profile` verrà chiamato in background, userà i dati nel `.env.local` per interrogare la Graph API e scaricherà il tuo vero Job Title e Department.
