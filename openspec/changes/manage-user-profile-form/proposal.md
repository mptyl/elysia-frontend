# Change: Manage User Profile Form

## Why
The profile page currently shows only basic authentication information (user ID, email, last sign in). Users need the ability to manage their organizational assignment and AI identity settings, which are critical for personalized AI context in the ThothAI ecosystem.

## What Changes
- **Fetch user profile data** from `public.user_profiles` joined with `public.org_units` when profile page loads
- **Org Unit select field** preloaded with all available `org_units`, allowing reassignment
- **AI Identity Base display** (read-only) showing the `ai_identity_base` from the associated org unit
- **AI Identity User editor** with plain-text textarea for long-form content (no formatting)
- **AI Identity Mode selector** allowing choice between `APPEND` and `REPLACE` modes
- **Save button** persisting changes to `user_profiles` table via Supabase
- **Cancel button** navigating back to home page without saving

## Impact
- **Affected specs**: `user-profile` (new capability)
- **Affected code**:
  - `app/profile/page.tsx` (major modification)
  - Possibly new type definitions for profile data
- **Database**: No schema changes required (tables already exist per KI documentation)
