# Auth Chain Reconfiguration Manual

This guide explains exactly what must be changed to make the full login chain work in a new environment:

`client -> frontend -> Supabase Auth -> Entra/Emulator -> callback -> frontend home`

## 1) What you must reconfigure

Change only configuration files. No code changes are needed.

### Frontend (`/opt/athena/elysia-frontend/.env.local`)
- `APP_BIND_HOST`: bind interface for Next.js (`0.0.0.0` in server mode).
- `APP_BIND_PORT`: frontend port (default `3090`).
- `APP_PUBLIC_ORIGIN`: canonical browser URL for this environment.
- `NEXT_PUBLIC_AUTH_PROVIDER`: `emulator` or `entra` (mandatory).
- `AUTH_PROVIDER_MODE`: must match `NEXT_PUBLIC_AUTH_PROVIDER`.
- `NEXT_PUBLIC_OAUTH_REDIRECT_PATH`: use `/auth/callback` to complete OAuth server-side and avoid login loop.
- `NEXT_PUBLIC_SUPABASE_URL`: keep `/supabase` when using frontend proxy.
- `SUPABASE_INTERNAL_URL`: Supabase internal endpoint reachable by Next.js server.
- `NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME`: shared auth cookie storage key. Keep identical across environments to avoid client/server session mismatch.
- `ENTRA_EMULATOR_INTERNAL_HOST`: emulator URL reachable by frontend server-side code.
- `NEXT_PUBLIC_ENTRA_EMULATOR_PUBLIC_BASE`: browser-visible emulator path/base (default `/entra`).

### Supabase (`/opt/athena/supabase-project/.env`)
- `SITE_URL`: frontend public origin.
- `ADDITIONAL_REDIRECT_URLS`: comma-separated allow-list of frontend callback/login URLs.
- `API_EXTERNAL_URL`: public Supabase/Kong URL.
- `SUPABASE_PUBLIC_URL`: public URL for Studio links.
- `GOTRUE_EXTERNAL_AZURE_URL`: emulator authority (`.../common`) or real Entra issuer.
- `GOTRUE_EXTERNAL_AZURE_REDIRECT_URI`: must point to frontend callback proxy (`<origin>/supabase/auth/v1/callback`).
- `GOTRUE_MAILER_EXTERNAL_HOSTS`: include all external hosts used to reach frontend.

### ldap-emulator (`/opt/athena/ldap-emulator/.env`)
- `ISSUER_URL`: base issuer URL presented by emulator.
- `ALLOW_DYNAMIC_REDIRECT_URI`: `true` for flexible dev/server test, `false` for strict allow-list mode.
- `DEFAULT_APP_REDIRECT_URIS`: fallback list used when bootstrapping app registrations.

## 2) Variable matrix

Use these profile files as source templates:
- `config/env/.env.frontend.server-vpn`
- `config/env/.env.supabase.server-vpn`
- `config/env/.env.ldap.server-vpn`
- `config/env/.env.frontend.local.example`
- `config/env/.env.supabase.local.example`
- `config/env/.env.ldap.local.example`

## 3) How to switch environment

1. Update profile files with the new host/IP/port.
2. Apply profile:
   - `scripts/auth-config/apply-server-vpn.sh`
3. Verify coherence:
   - `scripts/auth-config/verify-auth-config.sh`
4. Bootstrap profile schema (first run or new DB):
   - `scripts/auth-config/apply-profile-schema.sh`
5. Restart services:
   - `scripts/auth-config/restart-auth-stack.sh`
   - restart frontend (`npm run dev:server` or equivalent process manager).
6. Validate login flow from browser:
   - open `<APP_PUBLIC_ORIGIN>/login`
   - login
   - verify callback and home load.

## 4) Switch emulator <-> real Entra ID

Only env changes are required:
- Frontend: set `NEXT_PUBLIC_AUTH_PROVIDER=entra` and `AUTH_PROVIDER_MODE=entra`.
- Supabase:
  - `GOTRUE_EXTERNAL_AZURE_URL=https://login.microsoftonline.com/<TENANT_ID>/v2.0`
  - `GOTRUE_EXTERNAL_AZURE_CLIENT_ID=<real-client-id>`
  - `GOTRUE_EXTERNAL_AZURE_SECRET=<real-client-secret>`
  - keep `GOTRUE_EXTERNAL_AZURE_REDIRECT_URI=<APP_PUBLIC_ORIGIN>/supabase/auth/v1/callback`

## 5) Troubleshooting

### Redirect goes to localhost
- Check `SITE_URL` and `GOTRUE_EXTERNAL_AZURE_REDIRECT_URI` in Supabase `.env`.
- Check `APP_PUBLIC_ORIGIN` in frontend `.env.local`.
- Restart `supabase-auth`, `supabase-kong`, and frontend.

### `invalid_grant` after callback
- Ensure `redirect_uri` used in authorize and token exchange is exactly the same.
- Verify `GOTRUE_EXTERNAL_AZURE_REDIRECT_URI` equals `<origin>/supabase/auth/v1/callback`.
- Verify emulator receives matching `redirect_uri`.

### Login loop back to `/login`
- Verify frontend has `NEXT_PUBLIC_AUTH_PROVIDER` set to valid value.
- Verify session cookie domain/origin alignment by checking browser origin equals `APP_PUBLIC_ORIGIN`.
- Verify `NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME` is set and consistent between browser and server auth clients.

### Home page opens but chat/settings/data fail
- Check Elysia backend on `8090` is responsive (not only listening).
- If chat box is missing and you only see loading state, WebSocket `/ws/query` is likely disconnected.
- Restart stack with:
  - `scripts/auth-config/restart-auth-stack.sh`
- The restart script starts Elysia with `--reload false` to avoid server-side hangs caused by dev reload mode.

### Profile page shows `failed to load profile`
- Ensure profile tables exist in Supabase public schema:
  - `scripts/auth-config/apply-profile-schema.sh`
- Verify at least one row exists in `public.org_units` (script seeds `Default` automatically).

### Logout returns to home instead of login
- Verify frontend includes `/api/auth/signout` server route and that browser can call it.
- Ensure auth cookie names are aligned (`NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME` / `SUPABASE_AUTH_COOKIE_NAME`).

## 6) Security note

`NEXT_PUBLIC_AUTH_PROVIDER` is mandatory. Running without a provider is intentionally unsupported.
