# PLAN-auth-bypass-patch

## 1. Context Analysis
- **Goal**: Allow the frontend to run in two modes based on an environment variable (`NEXT_PUBLIC_AUTH_ENABLED`).
  - **Auth Active**: Standard behavior (login required, real user ID).
  - **Auth Inactive**: Bypass login, mock user ID as "1234".
- **Current State**:
  - Middleware enforces auth on all routes except `/login` (and static/api).
  - `AuthGuard` protects client-side routes.
  - `useAuthUserId` hook retrieves the Supabase user ID.
  - Session management relies on this ID.

## 2. Technical Architecture changes
We will introduce a new environment variable `NEXT_PUBLIC_AUTH_ENABLED`.

### A. Environment Configuration
- Add `NEXT_PUBLIC_AUTH_ENABLED` to `.env.local`.
- Default value: `true` (to maintain current security).
- **Note**: Ensure the variable is prefixed with `NEXT_PUBLIC_` so it is accessible in the client-side code (`useAuthUserId.ts` and `auth-guard.tsx`).

### B. Middleware (`middleware.ts`)
- **Current**: Redirects to `/login` if no session.
- **New**:
  - Check `process.env.NEXT_PUBLIC_AUTH_ENABLED`.
  - If `false`, skip the redirect logic from `/` to `/login`.
  - IMPORTANT: Middleware runs on edge logic, so env vars must be bundled or accessible at runtime.

### C. Client-Side Protection (`components/auth-guard.tsx`)
- **Current**: Checks Supabase session, redirects to `/login` if missing.
- **New**:
  - Check `process.env.NEXT_PUBLIC_AUTH_ENABLED`.
  - If `false`:
    - Set state to `authorized`.
    - Render children immediately.
    - If user visits `/login` manually, redirect to `/`.

### D. User Identity (`hooks/useAuthUserId.ts`)
- **Current**: Fetches real Supabase user.
- **New**:
  - Check `process.env.NEXT_PUBLIC_AUTH_ENABLED`.
  - If `false`:
    - Return `id: "1234"`.
    - Return a mock `user` object (e.g., `{ id: "1234", email: "mock@local", aud: "authenticated" }` as `User`).
    - Set `loading: false`.

## 3. Implementation Steps

### Step 1: Environment Setup
- [ ] Add `NEXT_PUBLIC_AUTH_ENABLED=true` to `.env.local`.

### Step 2: User ID Mocking
- [ ] Modify `hooks/useAuthUserId.ts`.
- [ ] Implement conditional logic to return "1234" when auth is disabled.

### Step 3: Auth Guard Update
- [ ] Modify `components/auth-guard.tsx`.
- [ ] Bypass session check if auth is disabled.
- [ ] Redirect `/login` to `/` if auth is disabled.

### Step 4: Middleware Update
- [ ] Modify `middleware.ts`.
- [ ] Skip server-side redirects if auth is disabled.

## 4. Verification Plan

### Manual Verification
1. **Case A: Auth Active (Default)**
   - Set `NEXT_PUBLIC_AUTH_ENABLED=true` (or remove it) in `.env.local`.
   - Restart dev server.
   - Visit `/`. Expect redirect to `/login`.
   - Login with real credentials. Expect real user ID.

2. **Case B: Auth Inactive**
   - Set `NEXT_PUBLIC_AUTH_ENABLED=false` in `.env.local`.
   - Restart dev server.
   - Visit `/`. Expect NO redirect (home page loads).
   - Visit `/login`. Expect redirect to `/`.
   - Verify User ID is "1234" (can be checked via React DevTools or by observing if user-specific data executes for "1234").

### Automated Tests
- No existing E2E tests for auth were found. Manual verification is sufficient for this patch.
