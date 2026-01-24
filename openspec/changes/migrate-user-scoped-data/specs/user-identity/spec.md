# Spec Delta: User Identity

## Capability: User Identity Management

This spec delta defines requirements for transitioning user identity from browser fingerprinting to Supabase authentication.

---

## REMOVED Requirements

### Requirement: Device Fingerprint Storage Shall Be Removed

- The system shall no longer use `localStorage` to cache `device_id`
- The `@fingerprintjs/fingerprintjs` library shall be removed from production bundle

#### Scenario: Application loads without fingerprinting
- **Given** a user opens the application
- **When** the application loads
- **Then** no device fingerprint shall be generated
- **And** no `device_id` shall be stored in localStorage

---

## ADDED Requirements

### Requirement: System Shall Use Supabase User ID as Primary Identity

The system shall use the Supabase authenticated user's `id` as the primary user identifier for all backend API calls.

#### Scenario: Authenticated user accesses application
- **Given** a user is authenticated via Supabase (Microsoft Entra ID)
- **When** the application needs to make API calls to Elysia backend
- **Then** the `user.id` from `supabase.auth.getUser()` shall be used as the `user_id` parameter

### Requirement: System Shall Redirect Unauthenticated Users to Login

The system shall redirect unauthenticated users to the login page when accessing protected routes.

#### Scenario: Unauthenticated user access
- **Given** a user is not authenticated
- **When** the user attempts to access protected routes (/, /chat, /settings)
- **Then** the user shall be redirected to `/login`

### Requirement: SessionContext Shall Expose Authenticated User ID

The `SessionContext` shall expose the authenticated user's ID via its `id` property.

#### Scenario: SessionContext provides user ID
- **Given** a user is authenticated
- **When** any component accesses `SessionContext.id`
- **Then** it shall receive the Supabase `user.id` (UUID format)
- **And** the value shall remain stable across page navigations

---

## MODIFIED Requirements

### Requirement: Conversations Shall Be Keyed by Authenticated User ID

Conversations shall be stored and retrieved using the authenticated user's ID instead of device fingerprint.

#### Scenario: User loads conversations
- **Given** a user is authenticated with `user.id = "abc-123"`
- **When** the ConversationContext calls `loadConversationsFromDB()`
- **Then** it shall request `/db/abc-123/conversations` from Elysia backend

### Requirement: Configurations Shall Be Keyed by Authenticated User ID

User configurations shall be stored and retrieved using the authenticated user's ID instead of device fingerprint.

#### Scenario: User saves configuration
- **Given** a user is authenticated
- **When** the user saves a configuration via `updateConfig()`
- **Then** the config shall be stored under the authenticated user's ID in Elysia backend
