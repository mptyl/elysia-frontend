# Project Context

## Purpose
**Athena Frontend** is an open-source, AI-powered Single Page Application (SPA) that serves as the user interface for the Weaviate Elysia platform. It provides an intuitive interface for AI conversations, data exploration, 3D visualizations, and configuration management.

This fork extends the official Elysia frontend with **multi-backend capability**, enabling the same UI to communicate with:
- **Elysia RAG Backend** (WebSocket - native)
- **n8n Workflows** (REST/Webhook)
- **Direct LLMs** (via LiteLLM/DSPy)

Custom integrations are isolated in `/app/integrations` using a Gateway Pattern to minimize merge conflicts with upstream releases.

## Tech Stack

### Core Framework
- **Next.js 14.2** – React framework with App Router (static export enabled)
- **React 18** – UI library
- **TypeScript 5** – Type-safe development (ES2017 target, strict mode)
- **Tailwind CSS 3.4** – Utility-first styling with custom design tokens

### UI Component Libraries
- **Radix UI** – Accessible, unstyled primitives (dialogs, dropdowns, tooltips, tabs, etc.)
- **Shadcn/ui** – Re-usable component system built on Radix
- **Framer Motion** – Animation library
- **Lucide React** – Icon library

### 3D Graphics & Visualization
- **Three.js** – 3D graphics
- **React Three Fiber** – React renderer for Three.js
- **React Three Drei** – Helper components for R3F
- **Recharts** – Data charting
- **XYFlow React** – Node-based flow diagrams

### Content Rendering
- **React Markdown** – Markdown rendering
- **React Syntax Highlighter** – Code highlighting
- **Rehype/Remark plugins** – Markdown processing

## Project Conventions

### Code Style
- ESLint with `next/core-web-vitals` and `next/typescript` presets
- Prettier for formatting
- **Path aliases**: Use `@/*` for imports (e.g., `@/app/components/...`)
- **Naming conventions**:
  - Components: PascalCase (`RenderChat.tsx`)
  - Hooks: camelCase prefixed with `use` (`useSocket.ts`)
  - Contexts: PascalCase suffixed with `Context` (`ConversationContext.tsx`)
  - Types: PascalCase (`MessagePayload`, `QueryPayload`)

### Architecture Patterns

```
elysia-frontend/
├── app/                    # Next.js App Router
│   ├── api/                # API route handlers
│   ├── components/         # Feature components (chat, config, explorer, etc.)
│   │   └── contexts/       # React Context providers
│   ├── pages/              # Main view components
│   ├── types/              # TypeScript definitions
│   └── integrations/       # 🔌 Custom multi-backend gateway (isolated)
├── components/ui/          # Shared Shadcn/Radix primitives
├── hooks/                  # Custom React hooks
└── lib/                    # Utility functions
```

**Key Patterns**:
- **Context-based state** – Global state via React Context (`SocketContext`, `ConversationContext`, `RouterContext`)
- **Client-side routing** – SPA navigation through `RouterContext`, no page reloads
- **UI/Data decoupling** – UI components consume standardized message types, agnostic to data source
- **Gateway Pattern** – Multi-backend dispatch isolated in `/app/integrations` with minimal core touchpoints

### Testing Strategy
- **Pre-commit**: Run `npm run lint` (ESLint)
- **Pre-merge**: Run `npm run build` – must complete without errors
- All TypeScript types must be valid
- Manual browser testing for UI changes

### Git Workflow
- Fork & feature branch workflow
- Ensure `npm run build` passes before submitting PRs
- Keep custom integration code isolated in `/app/integrations` to minimize merge conflicts
- Use conventional commit messages where practical

## Domain Context

**Elysia Ecosystem**:
- Frontend communicates with backend via WebSocket for real-time AI responses
- Backend performs RAG (Retrieval Augmented Generation) queries against Weaviate vector database
- Message payloads follow Elysia schema (`Message`, `ResponsePayload`, `ResultPayload`)

**Custom Multi-Backend Context**:
- Users can select working context (Elysia/n8n/LLM) before submitting prompts
- All backends return responses mapped to Elysia's message schema
- Slash commands (e.g., `/n8n analyze`) can route to specific backends

## Important Constraints

1. **Static Export** – Production builds use `NEXT_PUBLIC_IS_STATIC=true` for serving from Elysia Python backend
2. **Isolation** – Custom code must not modify core Elysia files beyond documented touchpoints in `SocketContext.tsx`
3. **Upgrade Path** – Must be able to pull upstream Elysia changes with minimal merge conflicts
4. **Browser Support** – ES2017+ modern browsers required

## External Dependencies

| Service | Protocol | Purpose |
|---------|----------|---------|
| **Elysia Backend** | WebSocket | Native RAG queries and AI responses |
| **n8n Server** | REST/Webhook | Workflow automation integration |
| **LiteLLM Proxy** | REST | Direct LLM access without RAG |
| **Weaviate** | (via backend) | Vector database for semantic search |
| **Microsoft Entra** | OIDC | Authentication (development uses emulator) |
