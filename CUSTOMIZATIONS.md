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

## Refactoring
- **File**: `ac1b1f3` (Commit)
- **Change**: Conditionally render CollectionSelection.

## Documentation
- **Folder**: `openspec/`
- **Change**: [NEW] Added project specifications and task tracking.
- **Folder**: `docs/`
- **Change**: [NEW] Added architecture brainstorming documents.
