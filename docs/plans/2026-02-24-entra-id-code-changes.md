# Entra ID - Modifiche al Codice per Microsoft Graph API

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correggere il sync dei profili utente per funzionare con Microsoft Entra ID reale invece del LDAP emulator, usando il Client Credentials Flow per ottenere un token app-level per Microsoft Graph API.

**Architecture:** Il sync-profile attuale chiama `fetchDirectoryUser(email)` senza passare un access token. Con `DIRECTORY_SERVICE_AUTH_MODE=bearer`, la chiamata a Microsoft Graph fallisce silenziosamente (401). La soluzione e' aggiungere un modulo `graph-token.ts` che ottiene un token app-level tramite client credentials grant, e modificare `sync-profile/route.ts` per usarlo.

**Tech Stack:** Next.js 16, TypeScript, Supabase SSR, Microsoft Graph API, OAuth 2.0 client credentials grant.

**Prerequisiti sul server:** Le seguenti variabili d'ambiente devono essere presenti nel `.env.local` del frontend (NON sono parte di questo piano, vanno configurate separatamente):
```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
DIRECTORY_SERVICE_URL=https://graph.microsoft.com
DIRECTORY_SERVICE_AUTH_MODE=bearer
```

**Validazione:** Questo progetto non ha un test framework (jest/vitest). La validazione e':
- `npm run build` — deve passare senza errori (include type checking TypeScript)
- `npm run lint` — deve passare senza errori

---

## Contesto per il developer

### Il problema

File `app/api/auth/sync-profile/route.ts`, riga 49:
```typescript
const dirUser = await fetchDirectoryUser(user.email);
```

La funzione `fetchDirectoryUser` in `lib/directory/client.ts` accetta un secondo parametro opzionale `accessToken`:
```typescript
export async function fetchDirectoryUser(
    userUpn: string,
    accessToken?: string,   // <-- MAI passato!
)
```

Quando `DIRECTORY_SERVICE_AUTH_MODE=bearer`, il client controlla:
```typescript
if (process.env.DIRECTORY_SERVICE_AUTH_MODE === "bearer" && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
}
```

Poiche' `accessToken` non viene passato, la condizione e' falsa, nessun header Authorization viene inviato, e Microsoft Graph API risponde 401.

### La soluzione

1. Creare `lib/directory/graph-token.ts` — ottiene un token app-level via OAuth 2.0 client credentials grant
2. Modificare `app/api/auth/sync-profile/route.ts` — importa e usa il token prima di chiamare `fetchDirectoryUser`

### File coinvolti

| File | Azione | Descrizione |
|---|---|---|
| `lib/directory/graph-token.ts` | **CREARE** | Modulo per ottenere access token Microsoft Graph via client credentials |
| `app/api/auth/sync-profile/route.ts` | **MODIFICARE** | Aggiungere import e passaggio del token a fetchDirectoryUser |

### File da NON modificare

- `lib/directory/client.ts` — gia' supporta il parametro `accessToken`, nessuna modifica necessaria
- `app/auth/callback/page.tsx` — chiama sync-profile come fire-and-forget, nessuna modifica
- `app/components/contexts/AuthContext.tsx` — il flusso OAuth non cambia

---

## Task 1: Creare il modulo graph-token.ts

**Files:**
- Create: `lib/directory/graph-token.ts`

**Step 1: Creare il file `lib/directory/graph-token.ts`**

Creare il file con questo contenuto esatto:

```typescript
/**
 * Microsoft Graph API token provider — Client Credentials Flow.
 *
 * Uses the app's own identity (client_id + client_secret) to obtain
 * an access token for Microsoft Graph API. This is server-to-server
 * and does not depend on the user's OAuth session.
 *
 * Required env vars:
 *   AZURE_TENANT_ID   — Entra ID tenant
 *   AZURE_CLIENT_ID   — App registration client ID
 *   AZURE_CLIENT_SECRET — App registration client secret
 *
 * The token is cached in memory and reused until 5 minutes before expiry.
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getGraphAccessToken(): Promise<string | null> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 300_000) {
        return cachedToken.token;
    }

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    if (!tenantId || !clientId || !clientSecret) {
        console.warn(
            "[GraphToken] AZURE_TENANT_ID, AZURE_CLIENT_ID, or AZURE_CLIENT_SECRET not configured, skipping Graph token acquisition",
        );
        return null;
    }

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
    });

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });

        if (!res.ok) {
            const errorBody = await res.text();
            console.error(
                `[GraphToken] Token request failed: ${res.status} — ${errorBody}`,
            );
            return null;
        }

        const data = await res.json();
        cachedToken = {
            token: data.access_token,
            expiresAt: Date.now() + data.expires_in * 1000,
        };
        return cachedToken.token;
    } catch (err) {
        console.error("[GraphToken] Token request error:", err);
        return null;
    }
}
```

**Step 2: Verificare che il build passi**

Run: `npm run build`
Expected: BUILD pass senza errori. Il nuovo file non e' ancora importato da nessuno, ma deve compilare correttamente.

**Step 3: Verificare il lint**

Run: `npm run lint`
Expected: PASS senza errori.

**Step 4: Commit**

```bash
git add lib/directory/graph-token.ts
git commit -m "feat: add Microsoft Graph API token provider via client credentials flow"
```

---

## Task 2: Modificare sync-profile per usare il token Graph API

**Files:**
- Modify: `app/api/auth/sync-profile/route.ts`

**Contesto**: Il file attuale (75 righe) importa `fetchDirectoryUser` da `@/lib/directory/client` e lo chiama alla riga 49 senza passare un access token. La modifica consiste in:
1. Aggiungere l'import di `getGraphAccessToken`
2. Ottenere il token prima della chiamata a `fetchDirectoryUser`
3. Passare il token come secondo argomento

**Step 1: Aggiungere l'import**

Alla riga 4 del file, dopo:
```typescript
import { fetchDirectoryUser } from "@/lib/directory/client";
```

Aggiungere:
```typescript
import { getGraphAccessToken } from "@/lib/directory/graph-token";
```

**Step 2: Modificare la chiamata a fetchDirectoryUser**

Sostituire la riga 49:
```typescript
        const dirUser = await fetchDirectoryUser(user.email);
```

Con queste due righe:
```typescript
        const graphToken = await getGraphAccessToken();
        const dirUser = await fetchDirectoryUser(user.email, graphToken ?? undefined);
```

**Nota**: `graphToken ?? undefined` converte `null` in `undefined` per compatibilita' con il parametro opzionale `accessToken?: string`. Se il token non e' disponibile (env vars mancanti, errore di rete), `fetchDirectoryUser` viene chiamato senza token, mantenendo la compatibilita' con la modalita' emulatore (`DIRECTORY_SERVICE_AUTH_MODE=none`).

**Step 3: Verificare il risultato finale**

Il file completo dopo le modifiche deve essere:

```typescript
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookies";
import { fetchDirectoryUser } from "@/lib/directory/client";
import { getGraphAccessToken } from "@/lib/directory/graph-token";

// Patched by scripts/set-route-dynamic.js before each build:
// "force-static" for static export, "force-dynamic" for server mode.
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/sync-profile
 *
 * Called after authentication to sync jobTitle and department
 * from the directory service into the Supabase user_profiles table.
 *
 * Resilient: if the directory service is unreachable, logs a warning
 * and returns 200 so the user can still use the app.
 */
export async function POST(request: NextRequest) {
    try {
        const response = NextResponse.json({ ok: true });

        const supabase = createServerClient(
            process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            {
                cookieOptions: getSupabaseCookieOptions(),
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options),
                        );
                    },
                },
            },
        );

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user?.email) {
            return NextResponse.json({ ok: true, reason: "no user/email" });
        }

        const graphToken = await getGraphAccessToken();
        const dirUser = await fetchDirectoryUser(user.email, graphToken ?? undefined);

        if (!dirUser) {
            console.warn("[sync-profile] Directory service returned no data for", user.email);
            return NextResponse.json({ ok: true, reason: "directory_unavailable" });
        }

        const { error } = await supabase.from("user_profiles").upsert(
            {
                id: user.id,
                job_title: dirUser.jobTitle,
                department: dirUser.department,
            },
            { onConflict: "id", ignoreDuplicates: false },
        );

        if (error) {
            console.error("[sync-profile] Supabase upsert error:", error);
        }

        return response;
    } catch (err) {
        console.error("[sync-profile] Unexpected error:", err);
        return NextResponse.json({ ok: true, reason: "error" });
    }
}
```

**Step 4: Verificare il build**

Run: `npm run build`
Expected: BUILD pass senza errori.

**Step 5: Verificare il lint**

Run: `npm run lint`
Expected: PASS senza errori.

**Step 6: Commit**

```bash
git add app/api/auth/sync-profile/route.ts
git commit -m "fix: pass Graph API access token to fetchDirectoryUser for Entra ID profile sync"
```

---

## Verifica finale

Dopo aver completato i due task:

**Checklist:**
- [ ] File `lib/directory/graph-token.ts` esiste con la funzione `getGraphAccessToken`
- [ ] File `app/api/auth/sync-profile/route.ts` importa `getGraphAccessToken` e lo usa
- [ ] `npm run build` passa senza errori
- [ ] `npm run lint` passa senza errori
- [ ] Nessun altro file e' stato modificato

**File NON toccati (confermare che sono invariati):**
- [ ] `lib/directory/client.ts` — invariato
- [ ] `app/auth/callback/page.tsx` — invariato
- [ ] `app/components/contexts/AuthContext.tsx` — invariato
- [ ] `middleware.ts` — invariato

**Compatibilita' emulatore:**
Il codice resta compatibile con la modalita' emulatore:
- Se `AZURE_TENANT_ID/CLIENT_ID/SECRET` non sono configurati → `getGraphAccessToken()` ritorna `null`
- `null` viene convertito in `undefined` → `fetchDirectoryUser(email, undefined)`
- Con `DIRECTORY_SERVICE_AUTH_MODE=none` (emulatore) → nessun header Authorization inviato (comportamento invariato)
