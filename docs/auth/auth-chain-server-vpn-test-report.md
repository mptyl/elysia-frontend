# Auth Chain Server VPN Test Report

## Target
- Frontend entrypoint: `http://10.1.1.11:3090`
- Date: 2026-02-13
- Scope: `frontend -> Supabase -> ldap-emulator -> callback -> home`

## Config Applied
- Frontend profile: `config/env/.env.frontend.server-vpn` -> `/opt/athena/elysia-frontend/.env.local`
- Supabase overlay: `config/env/.env.supabase.server-vpn` -> `/opt/athena/supabase-project/.env`
- ldap-emulator profile: `config/env/.env.ldap.server-vpn` -> `/opt/athena/ldap-emulator/.env`

## Automated checks completed
- Removed auth-bypass mode in frontend code (`NEXT_PUBLIC_AUTH_ENABLED` no longer used).
- Added mandatory provider mode validation (`NEXT_PUBLIC_AUTH_PROVIDER` / `AUTH_PROVIDER_MODE`).
- Added host-aware OAuth rewrite in `app/api/auth/authorize/route.ts`.
- Added config verification script: `scripts/auth-config/verify-auth-config.sh`.
- OAuth redirect path configured to `/auth/callback` (server-side session exchange).
- Verified `GET /login` returns `HTTP 200` on port `3090`.
- Verified `/api/auth/authorize` returns `302` with:
  - `redirect_to=http://10.1.1.11:3090/login`
  - `redirect_uri=http://10.1.1.11:3090/supabase/auth/v1/callback`
  when request host is `10.1.1.11:3090`.
- Verified `supabase-auth` container env includes:
  - `GOTRUE_SITE_URL=http://10.1.1.11:3090`
  - `GOTRUE_EXTERNAL_AZURE_REDIRECT_URI=http://10.1.1.11:3090/supabase/auth/v1/callback`
  - `GOTRUE_MAILER_EXTERNAL_HOSTS=10.1.1.11,localhost,127.0.0.1`

## Manual checks (to run with user collaboration)
- [ ] Open `http://10.1.1.11:3090/login` from VPN client.
- [ ] Start login flow.
- [ ] Verify redirect chain:
  - `/api/auth/authorize`
  - `/entra/.../authorize`
  - `/supabase/auth/v1/callback`
  - return to app and load home.
- [ ] Confirm no `localhost` appears in browser-visible redirect URLs.
- [ ] Confirm no `invalid_grant` in `supabase-auth` logs during successful login.

## Notes
- Previous logs showed intermittent `invalid_grant` caused by redirect URI mismatch (`localhost` vs external host).
- Current configuration enforces callback rewrite based on incoming request origin and aligned env values.
