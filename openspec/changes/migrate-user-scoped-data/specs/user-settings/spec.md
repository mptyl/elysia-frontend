# Spec Delta: User Settings

## Capability: Cross-Device User Settings

This spec delta defines requirements for storing user preferences in Supabase for cross-device synchronization.

---

## ADDED Requirements

### Requirement: System Shall Store User Preferences in Supabase Table

The system shall store user preferences in a Supabase `user_settings` table with JSONB storage.

#### Scenario: Settings table structure
- **Given** the Supabase database schema
- **When** the `user_settings` table is queried
- **Then** it shall contain columns: `user_id` (UUID, PK), `settings` (JSONB), `created_at`, `updated_at`

### Requirement: User Settings Shall Enforce Row-Level Security

The `user_settings` table shall implement RLS policies ensuring users can only access their own settings.

#### Scenario: User queries own settings
- **Given** a user is authenticated with `user.id = "abc-123"`
- **When** the user queries `SELECT * FROM user_settings`
- **Then** only rows where `user_id = "abc-123"` shall be returned

### Requirement: Globe Settings Shall Be Stored in Supabase

Globe 3D visualization settings shall be stored in the `user_settings` table under the `globe` namespace.

#### Scenario: User saves globe settings
- **Given** a user is authenticated
- **When** the user changes globe visualization settings
- **Then** the settings shall be upserted to `user_settings.settings.globe`

#### Scenario: Cross-device settings sync
- **Given** a user saved globe settings on device A
- **When** the user logs in on device B
- **Then** the globe settings shall be loaded from Supabase

---

## REMOVED Requirements

### Requirement: LocalStorage Globe Settings Shall Be Removed

- Globe settings shall no longer be stored in browser localStorage
- The `globe_settings` key shall be cleared from localStorage after migration

#### Scenario: Globe settings not in localStorage
- **Given** a user is authenticated
- **When** the application saves or loads globe settings
- **Then** localStorage shall not be accessed for `globe_settings` key
