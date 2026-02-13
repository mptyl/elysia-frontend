# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Athena is a fork of Weaviate's **elysia-frontend** — an AI-powered SPA built with Next.js 14 (App Router), React 18, TypeScript, and Tailwind CSS. It provides chat/RAG, data exploration, 3D visualization, and configuration management interfaces backed by an Elysia (FastAPI) backend and Supabase for auth.

## Commands

```bash
npm run dev              # Dev server on port 3090
npm run dev:server       # Dev server bound to 0.0.0.0
npm run build            # Production build (static export mode)
npm run build:clean      # Remove .next/out then build
npm run assemble         # Build + export static files to backend
npm run lint             # ESLint
npm test                 # Runs lint (no test suite)
npm start                # Production server on port 3090
```

**Build must pass before any contribution** (`npm run build`).

## Architecture

### Two Build Modes

- **Server mode** (`NEXT_PUBLIC_IS_STATIC=false`): Next.js runs on port 3090, proxies all backend traffic via `next.config.js` rewrites (`/supabase/*`, `/entra/*`, Elysia API paths)
- **Static export** (`NEXT_PUBLIC_IS_STATIC=true`): Outputs to `out/`, served by the Elysia/FastAPI backend directly

### SPA Routing (Not File-Based)

Pages are rendered by `app/page.tsx` based on `RouterContext` state, not Next.js file routing. Routes: `chat`, `data`, `collection`, `settings`, `eval`, `feedback`, `elysia`, `display`. Page components live in `app/pages/`.

### Context Provider Stack (`app/layout.tsx`)

ToastProvider → RouterProvider → SessionProvider → CollectionProvider → ConversationProvider → SocketProvider → EvaluationProvider → ProcessingProvider → AuthGuard → AppShell

All global state uses React Context (no Redux/Zustand).

### Authentication

Two provider modes controlled by `NEXT_PUBLIC_AUTH_PROVIDER`:
- `emulator` — local Entra ID emulator for dev
- `entra` — production Microsoft Entra ID via OAuth

Auth flow: Login → `/api/auth/authorize` → Supabase OAuth → Entra/Emulator → `/auth/callback` → `/api/auth/session` → Home

Key auth files:
- `middleware.ts` — server-side session check, redirects unauthenticated to `/login`
- `app/components/contexts/AuthContext.tsx` — `useAuth()` hook (session, signIn, signOut)
- `components/auth-guard.tsx` — client-side route protection
- `lib/auth/provider.ts` — auth mode detection helpers
- `lib/supabase/client.ts` — browser Supabase client (uses relative `/supabase` proxy in server mode)
- `lib/supabase/cookies.ts` — auth cookie config (`sb-athena-auth-token`)
- `app/api/auth/` — authorize, session, signout API routes

User identity hooks: `hooks/useAuthUserId.ts` (Supabase user), `hooks/useUserProfile.ts` (profile from `user_profiles` table).

### WebSocket

Direct connection to Elysia backend (`host.ts:getWebsocketHost()`). In server mode connects to port 8090 directly (Next.js rewrites don't support WebSocket).

### Key Environment Variables

```
NEXT_PUBLIC_AUTH_PROVIDER=emulator|entra     # Required
NEXT_PUBLIC_SUPABASE_URL=/supabase
SUPABASE_INTERNAL_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
ELYSIA_INTERNAL_URL=http://127.0.0.1:8090
ENTRA_INTERNAL_URL=http://127.0.0.1:8029
ENTRA_EMULATOR_INTERNAL_HOST=http://host.docker.internal:8029
NEXT_PUBLIC_ENTRA_EMULATOR_PUBLIC_BASE=/entra
```

## Code Organization

- `app/components/` — feature components (chat/, configuration/, contexts/, navigation/, threejs/, dialog/, evaluation/, explorer/)
- `app/pages/` — top-level page components (ChatPage, DataPage, etc.)
- `app/types/` — TypeScript interfaces by domain
- `app/api/` — Next.js API routes (auth endpoints + backend wrappers)
- `components/ui/` — shadcn/Radix primitives (style: "new-york", see `components.json`)
- `hooks/` — shared React hooks
- `lib/` — utilities (auth, supabase, utils)
- `app/config/branding.ts` — centralized branding constants (Athena vs Elysia)

## Upstream Fork Notes

Fork of `weaviate/elysia-frontend`. Key divergences tracked in `CUSTOMIZATIONS.md`:
- Branding centralized in `app/config/branding.ts`
- Added features: RAG toggle, 3D shape selector, custom start dialog
- High-risk merge files: SidebarComponent.tsx, QueryInput.tsx

## Styling

Tailwind CSS with HSL CSS custom properties for theming (`app/globals.css`). Shadcn components use `class-variance-authority`. Custom animations defined in globals.css. Path alias `@/*` maps to project root.
