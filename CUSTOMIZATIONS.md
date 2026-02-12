# Athena Customizations (Frontend)

This document tracks all divergences from the upstream `weaviate/elysia-frontend` repository.

## Branding
- **File**: `app/components/navigation/SidebarComponent.tsx`
- **Change**: Replaced specific "Elysia" branding with "Athena", changed logo references, removed direct GitHub links to upstream (consolidated in footer).
- **File**: `app/layout.tsx`, `package-lock.json`
- **Change**: Metadata updates for branding.

## Features
- **File**: `app/components/QueryInput.tsx` (implied from features)
- **Change**: Added RAG Toggle UI element to switch between Retrieval and Direct Answer modes.
- **File**: `app/pages/ChatPage.tsx`
- **Change**: Integration of RAG toggle state handling.
- **File**: `app/components/threejs/*`
- **Change**: Implemented "Shape Type" selector in `GlobeControlsPanel.tsx` (Shapes: Sphere, Torus, Box, Icosahedron) and updated `AbstractSphere.tsx` to handle dynamic geometry switching.

- **File**: `ac1b1f3` (Commit)
- **Change**: Conditionally render CollectionSelection.

## Configuration & Branding
- **File**: `app/config/branding.ts`
- **Change**: [NEW] Centralized branding constants (AppName, Logo, etc.).
- **File**: `app/components/dialog/StartDialog.tsx`
- **Change**: Custom start dialog content.
- **File**: `app/components/configuration/sections/AgentSection.tsx`
- **Change**: Modifications to agent configuration UI.
- **File**: `app/components/configuration/sections/StorageSection.tsx`
- **Change**: Custom storage settings UI.

## Documentation
- **Folder**: `openspec/`
- **Change**: [NEW] Added project specifications and task tracking.
- **Change**: [NEW] Added architecture brainstorming documents.

## Upstream Synchronization Risks

> **CRITICAL**: This fork modifies UI components that are frequently updated upstream. Expect merge conflicts.

### High Risk Files (Manual Resolution Likely Required)
1. **`app/components/navigation/SidebarComponent.tsx`**:
   - **Risk**: Moderate/High. Branding changes ("Athena" logo/text) replace hardcoded "Elysia" strings and assets.
   - **Resolution**: Keep Athena branding. If upstream changes the sidebar structure, manually re-apply the branding changes to the new structure.

2. **`app/components/QueryInput.tsx`**:
   - **Risk**: Moderate. Added RAG Toggle UI logic.
   - **Resolution**: Preserve the toggle button and its state connection.

### Maintenance Protocol
- Do not blindly accept "upstream" changes for UI components if it reverts branding.
- Check `package.json` for major dependency updates (e.g., Next.js version bumps) that might break custom components.
