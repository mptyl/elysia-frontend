# Migrate Browser-Bound Data to User-Scoped Data

## Summary
This change migrates all browser-based data (localStorage, device fingerprinting) to be associated with authenticated Supabase users instead of being tied to the browser/device.

## Motivation
Currently, user data (conversation history, settings, configurations) is keyed by a browser fingerprint (`device_id`). This means:
1. Conversations are lost if user changes browser/device
2. Multiple users on same device share data
3. No data portability between devices

After implementing Supabase Auth, we need to transition to using the authenticated `user.id` as the primary key for all user-scoped data.

## Scope

### What IS Currently Browser-Bound (Will Migrate)

| Data Type | Current Storage | File | Impact |
|-----------|-----------------|------|--------|
| **Conversations** | Backend (Elysia) keyed by `device_id` | `ConversationContext.tsx`, API calls | HIGH |
| **User Config** | Backend (Elysia) keyed by `device_id` | `SessionContext.tsx`, `saveConfig.ts` | HIGH |
| **Globe 3D Settings** | `localStorage` | `useGlobeSettings.ts` | LOW |
| **Device ID Cache** | `localStorage` | `getDeviceId.ts` | REMOVED |

### What is NOT Changing
- Auth tokens (already in Supabase session storage, managed by `@supabase/ssr`)
- User Profile (already in Supabase `user_profiles` table)

## Status: PROPOSAL

## Related Changes
- depends-on: `manage-user-profile-form` (user authentication must be working)
