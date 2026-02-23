# Prompt Enhancer — Design Document

**Date:** 2026-02-19
**Status:** Approved

## Purpose

A new page in the Elysia frontend that helps users iteratively improve prompts before sending them to the chat. The user writes a raw prompt, an LLM enhances it following prompt engineering best practices, and the user can refine it through multiple iterations with suggestions. The final prompt can be sent directly to the chat page.

## Key Decisions

| Decision | Choice |
|----------|--------|
| LLM communication | REST endpoint on Elysia backend (FastAPI + DSPy) |
| "Usa" behavior | Navigate to chat with prompt pre-filled (not auto-sent) |
| Iteration history | Ephemeral (React state), lost on page change |
| Prompt best practices | External XML files, editable without code changes |
| Scope | Full-stack: frontend + backend + XML prompts |
| Testing | Parallel environment on ports 3091/8091, no disruption to 3090/8090 |

## Page Layout

```
+-----------------------------------------------------------+
|  [Pulisci]     TEXTAREA SUPERIORE (80%)            [Usa]  |
|                                                           |
|  Enhanced prompt (editable by user)                       |
|                                                           |
|                                                           |
|                            < 2/5 > (history navigation)   |
+-----------------------------------------------------------+
|  [Abbandona]   TEXTAREA INFERIORE (20%)        [Migliora] |
|                                                           |
|  Initial prompt / modification suggestions                |
|                                                           |
+-----------------------------------------------------------+
```

### Buttons

| Button | Position | Action |
|--------|----------|--------|
| Pulisci | Top-left of upper textarea | Clear upper textarea + reset history |
| Usa | Top-right of upper textarea | Navigate to chat with upper text pre-filled |
| Abbandona | Bottom-left of lower textarea | `changePage("chat")`, no side effects |
| Migliora | Bottom-right of lower textarea | Call LLM endpoint, result goes to upper textarea, appended to history |

### History Navigation

- Array of strings in `useState` — each entry is a version of the upper prompt
- Prev/next navigation changes which version is displayed
- Editing the upper textarea overwrites the current history entry
- "Pulisci" resets everything (empty array)
- Visible only when there are 2+ entries

## Frontend Architecture

### New Files

- `app/pages/PromptEnhancerPage.tsx` — page component
- `app/api/enhancePrompt.ts` — fetch wrapper for backend endpoint

### Modified Files

- `app/components/contexts/RouterContext.tsx` — add `"prompt-enhancer"` to `validPages`, add `prefillPrompt` state
- `app/page.tsx` — add conditional render for PromptEnhancerPage
- `app/components/navigation/SidebarComponent.tsx` — add menu item with enhancement icon
- `app/components/chat/QueryInput.tsx` — read `prefillPrompt` from context and populate textarea

### Chat Pre-fill Mechanism

1. User presses "Usa" on Prompt Enhancer page
2. `prefillPrompt` is set in RouterContext state
3. `changePage("chat")` navigates to chat
4. QueryInput reads `prefillPrompt`, populates textarea, resets the value
5. User sees the prompt ready to send (not auto-sent)

## Backend Architecture

### New Module

```
elysia/prompt_enhancer/
  __init__.py
  enhancer.py              # Core logic (load XML, call DSPy)
  prompts/
    enhancement_system.xml   # Prompt engineering best practices (detailed)
    validation_criteria.xml  # Criteria for validating user suggestions
```

### Endpoint

`POST /util/enhance_prompt`

**Request:**
```json
{
  "user_id": "string",
  "conversation_id": "string",
  "prompt": "string | null",
  "suggestion": "string"
}
```

- `prompt` is null on first iteration (user submits raw prompt via `suggestion`)
- `prompt` contains current enhanced version on subsequent iterations

**Response:**
```json
{
  "enhanced_prompt": "string",
  "feedback": "string",
  "error": "string"
}
```

- `enhanced_prompt`: the improved prompt (goes to upper textarea)
- `feedback`: message for the user if suggestion is invalid (goes to lower textarea)
- `error`: technical error message

### DSPy Signatures

**1. PromptEnhancerSignature** — First iteration (prompt is null):
- Input: `suggestion` (raw prompt) + `enhancement_system` (XML content)
- Output: `enhanced_prompt`
- Purpose: Transform a raw prompt into a well-structured one following best practices

**2. PromptRefinementSignature** — Subsequent iterations:
- Input: `prompt` (current version) + `suggestion` (user's modification request) + `enhancement_system` (XML) + `validation_criteria` (XML)
- Output: `enhanced_prompt` OR `feedback`
- Purpose: Validate suggestion relevance, then refine the prompt accordingly

### XML Configuration Files

**`enhancement_system.xml`** — Comprehensive prompt engineering best practices:
- Will be thoroughly developed based on established frameworks (OpenAI, Anthropic, academic literature)
- Covers: clarity, structure, specificity, role definition, output formatting, chain-of-thought, few-shot patterns, constraint specification, etc.
- Editable by users without code changes

**`validation_criteria.xml`** — Criteria for validating modification suggestions:
- Relevance to the current prompt
- Actionability of the suggestion
- Sufficient detail for meaningful improvement

### LLM Model

Uses `BASE_MODEL` from existing `.env` configuration (currently `gemini-3-flash-preview` via OpenRouter).

### Files to Modify

- `elysia/elysia/api/routes/utils.py` — add endpoint
- `elysia/elysia/api/api_types.py` — add `PromptEnhancementData` model

## Parallel Test Environment

To avoid disrupting the running services (3090/8090):

- **Frontend:** Run on port 3091 with `ELYSIA_INTERNAL_URL=http://127.0.0.1:8091` and `NEXT_PUBLIC_ELYSIA_WS_PORT=8091`
- **Backend:** Run with `elysia start --host 0.0.0.0 --port 8091`
- Shared infrastructure (Supabase :8000, Weaviate :8080, ldap-emulator :8029) remains untouched

## Data Flow

1. User writes raw prompt in lower textarea, presses "Migliora"
2. Frontend calls `POST /util/enhance_prompt` with `{prompt: null, suggestion: rawText}`
3. Backend loads XML best practices, calls DSPy `PromptEnhancerSignature`
4. Enhanced prompt returned, displayed in upper textarea, added to history
5. User writes refinement suggestion in lower textarea, presses "Migliora"
6. Frontend calls endpoint with `{prompt: currentEnhanced, suggestion: refinementText}`
7. Backend validates suggestion (via `validation_criteria.xml`), then calls `PromptRefinementSignature`
8. If valid: improved prompt returned to upper textarea, added to history
9. If invalid: feedback message returned to lower textarea
10. User navigates history with prev/next to compare versions
11. User presses "Usa": navigates to chat with prompt pre-filled in QueryInput
