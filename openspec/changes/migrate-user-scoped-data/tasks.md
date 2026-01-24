# Tasks: Migrate User-Scoped Data

## Overview
Replace browser fingerprint-based user identity with Supabase authenticated user ID across the frontend.

---

## Phase 1: Core Identity Migration

### 1.1 Create Auth Hook for User ID
- [ ] Create `hooks/useAuthUserId.ts` that returns authenticated `user.id`
- [ ] Handle loading state and unauthenticated fallback
- [ ] Dependencies: `@supabase/ssr`, `lib/supabase/client.ts`

### 1.2 Update SessionContext Identity
- [ ] Replace `useDeviceId()` with `useAuthUserId()` in `SessionContext.tsx`
- [ ] Update `id` state initialization to use Supabase user
- [ ] Add redirect to `/login` if not authenticated
- [ ] Dependencies: 1.1

### 1.3 Deprecate Device Fingerprinting
- [ ] Add deprecation warning to `app/getDeviceId.ts`
- [ ] Keep file for backward compatibility during transition
- [ ] Dependencies: 1.2 tested and working

---

## Phase 2: Settings Migration

### 2.1 Create User Settings Table (Supabase)
- [ ] Create migration: `user_settings` table with `user_id`, `settings_json` JSONB
- [ ] Add RLS policies for user-owned data
- [ ] Dependencies: Supabase local environment

### 2.2 Create useUserSettings Hook
- [ ] Create `hooks/useUserSettings.ts` for read/write settings
- [ ] Support namespaced settings (globe, theme, etc.)
- [ ] Dependencies: 2.1

### 2.3 Migrate Globe Settings
- [ ] Update `useGlobeSettings.ts` to use `useUserSettings('globe')`
- [ ] Add one-time migration from localStorage on first load
- [ ] Clear localStorage after successful migration
- [ ] Dependencies: 2.2

---

## Phase 3: Cleanup

### 3.1 Remove Device Fingerprint Dependency
- [ ] Remove `@fingerprintjs/fingerprintjs` from `package.json`
- [ ] Delete `app/getDeviceId.ts`
- [ ] Remove `device_id` from localStorage
- [ ] Dependencies: 1.3 confirmed, all tests passing

### 3.2 Update Documentation
- [ ] Update `README.md` to reflect user-based identity
- [ ] Document new auth requirements
- [ ] Dependencies: 3.1

---

## Verification Criteria

1. **Login required**: Accessing `/` without authentication redirects to `/login`
2. **Conversations persist**: After login, user's conversations load correctly
3. **Cross-device access**: Same user can access conversations from different browsers
4. **Settings sync**: Globe settings changes on one device appear on another
5. **No fingerprint**: Device fingerprint library no longer loaded in browser DevTools
