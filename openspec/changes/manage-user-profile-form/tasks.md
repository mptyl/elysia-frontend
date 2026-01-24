# Tasks: Manage User Profile Form

## 1. Data Fetching & Types
- [x] 1.1 Create TypeScript type definitions for `UserProfile`, `OrgUnit`, and `AIIdentityMode`
- [x] 1.2 Implement `useUserProfile` hook to fetch user profile with org unit data via Supabase
- [x] 1.3 Add on-the-fly profile creation in hook if profile not found (no default org_unit)
- [x] 1.4 Implement `useOrgUnits` hook to fetch all available org units for the select dropdown

## 2. UI Components
- [x] 2.1 Add org unit `Select` component preloaded with all `org_units`
- [x] 2.2 Add read-only display field for `ai_identity_base` (from org unit)
- [x] 2.3 Add plain-text `Textarea` for `ai_identity_user` editing (no formatting)
- [x] 2.4 Add `Select` component for `ai_identity_mode` (APPEND/REPLACE)

## 3. Form Logic
- [x] 3.1 Implement form state management with controlled components
- [x] 3.2 Implement Save handler to update `user_profiles` table via Supabase
- [x] 3.3 Implement Cancel handler navigating to home page without saving
- [x] 3.4 Add loading and error states for fetch and save operations

## 4. Verification
- [ ] 4.1 Manual test: Navigate to profile, verify org units are loaded in select
- [ ] 4.2 Manual test: Change org unit, verify `ai_identity_base` updates
- [ ] 4.3 Manual test: Edit `ai_identity_user`, save, reload and verify persistence
- [ ] 4.4 Manual test: Change `ai_identity_mode`, save, reload and verify
- [ ] 4.5 Manual test: Cancel button returns to home without saving changes
