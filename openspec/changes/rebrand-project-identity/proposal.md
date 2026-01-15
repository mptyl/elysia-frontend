# Change: Rebrand Project Identity

## Why
The project needs to be presented externally as "Athena" to align with new branding requirements, while maintaining "Elysia" references internally for technical compatibility with the backend.

## What Changes
- **Project Identity**: Renaming the visible application name from "Elysia" to "Athena" in the UI and metadata.
- **Documentation**: Updating visible documentation to refer to the project as "Athena".
- **Internal References**: Preserving "Elysia" for backend connections, API schemas, and internal code structures.

## Impact
- **Affected Specs**: `branding` (New Spec)
- **Affected Code**: 
    - `app/layout.tsx` (Metadata, Titles)
    - `app/page.tsx` (Welcome headers)
    - `components/` (Any component with hardcoded "Elysia" label)
