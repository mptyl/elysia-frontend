# Prompt Enhancer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-stack Prompt Enhancer feature — a new page where users iteratively improve prompts via LLM assistance, then send the result to the chat.

**Architecture:** New frontend page (`PromptEnhancerPage`) integrated into the SPA router, communicating via REST with a new backend endpoint (`POST /util/enhance_prompt`) that uses DSPy + configurable XML prompt files. Chat pre-fill via shared RouterContext state.

**Tech Stack:** Next.js 14 / React 18 / TypeScript / Tailwind (frontend), FastAPI / DSPy / Pydantic (backend), XML config files for prompt engineering best practices.

**Design doc:** `docs/plans/2026-02-19-prompt-enhancer-design.md`

---

### Task 0: Set up parallel test environment

**Goal:** Run a second frontend+backend on ports 3091/8091 without disturbing production (3090/8090).

**Files:**
- Create: `/opt/athena/elysia-frontend/.env.test.local`

**Step 1: Create test environment file**

Create `/opt/athena/elysia-frontend/.env.test.local` with content:

```env
APP_BIND_PORT=3091
APP_PUBLIC_ORIGIN=http://10.1.1.11:3091
ELYSIA_INTERNAL_URL=http://127.0.0.1:8091
NEXT_PUBLIC_ELYSIA_WS_PORT=8091
```

**Step 2: Verify backend can start on port 8091**

Run from a second terminal:
```bash
cd /opt/athena/elysia && source .venv/bin/activate && elysia start --host 0.0.0.0 --port 8091
```
Expected: Server starts on port 8091. Ctrl+C to stop for now.

**Step 3: Verify frontend can start on port 3091**

Run (loads `.env.local` first, then `.env.test.local` overrides):
```bash
cd /opt/athena/elysia-frontend && env $(grep -v '^#' .env.test.local | xargs) npm run dev
```
Expected: Next.js dev server on `http://0.0.0.0:3091`. Verify it loads the login page.

**Step 4: Commit**

```bash
cd /opt/athena/elysia-frontend && git add .env.test.local
git commit -m "chore: add test environment config for parallel dev on ports 3091/8091"
```

---

### Task 1: Backend — XML prompt files

**Goal:** Create the two XML configuration files with thorough prompt engineering best practices.

**Files:**
- Create: `/opt/athena/elysia/elysia/prompt_enhancer/__init__.py`
- Create: `/opt/athena/elysia/elysia/prompt_enhancer/prompts/enhancement_system.xml`
- Create: `/opt/athena/elysia/elysia/prompt_enhancer/prompts/validation_criteria.xml`

**Step 1: Create module directory and `__init__.py`**

```bash
mkdir -p /opt/athena/elysia/elysia/prompt_enhancer/prompts
touch /opt/athena/elysia/elysia/prompt_enhancer/__init__.py
```

**Step 2: Write `enhancement_system.xml`**

Create `/opt/athena/elysia/elysia/prompt_enhancer/prompts/enhancement_system.xml`.

This file must be comprehensive and well-researched. It should cover at minimum:

- **Role definition**: Instruct the LLM to act as a prompt engineering expert
- **Task framing**: Clear objective — improve the user's prompt
- **Output language**: Respond in the same language as the user's prompt
- **Best practices to apply** (each as a `<principle>` with name, description, and examples):
  1. **Clarity and specificity** — Replace vague language with precise, concrete instructions
  2. **Structured format** — Use sections (role, context, task, constraints, output format) when appropriate
  3. **Role assignment** — Add an expert persona if beneficial (e.g., "You are a senior data analyst...")
  4. **Context provision** — Ensure enough background is given for the LLM to understand the domain
  5. **Explicit constraints** — Add boundaries, limitations, what NOT to do
  6. **Output format specification** — Define expected format (JSON, markdown, bullet points, etc.)
  7. **Chain-of-thought elicitation** — Add "think step by step" or reasoning instructions when appropriate
  8. **Few-shot examples** — Suggest adding input/output examples when the task is ambiguous
  9. **Tone and style** — Specify desired communication style if relevant
  10. **Decomposition** — Break complex tasks into subtasks
  11. **Evaluation criteria** — Include how success should be measured
  12. **Edge case handling** — Address what to do with unexpected inputs
- **Anti-patterns to avoid**: Overly verbose prompts, contradictory instructions, ambiguous pronouns
- **Output instructions**: Return ONLY the improved prompt, no meta-commentary

Use the XML structure pattern from the ethical guard (`<prompt-enhancement-system>` with `<principle name="...">` children). See `/opt/athena/elysia/elysia/guardrails/prompts/input_filter.xml` for the structural pattern.

**Step 3: Write `validation_criteria.xml`**

Create `/opt/athena/elysia/elysia/prompt_enhancer/prompts/validation_criteria.xml`.

This file defines how the LLM should validate a user's refinement suggestion. Criteria:

- **Relevance**: The suggestion must reference or relate to the prompt being refined
- **Actionability**: Must contain concrete modification instructions (not just "make it better")
- **Specificity**: Must indicate WHAT to change, not just that something should change
- **Non-emptiness**: Must contain meaningful text beyond whitespace
- **Constructiveness**: Must aim to improve, not just criticize
- **Output behavior**: If invalid, generate helpful feedback explaining what's missing and how to formulate a better suggestion. If valid, proceed with refinement.

**Step 4: Commit**

```bash
cd /opt/athena/elysia && git add elysia/prompt_enhancer/
git commit -m "feat(prompt-enhancer): add XML prompt configuration files for enhancement system and validation criteria"
```

---

### Task 2: Backend — DSPy signatures and enhancer module

**Goal:** Create the Python module with DSPy signatures and core enhancement logic.

**Files:**
- Create: `/opt/athena/elysia/elysia/prompt_enhancer/enhancer.py`

**Reference files (read before writing):**
- `/opt/athena/elysia/elysia/guardrails/ethical_guard.py` — pattern for XML loading + DSPy usage
- `/opt/athena/elysia/elysia/tree/prompt_templates.py` — pattern for DSPy Signature definitions
- `/opt/athena/elysia/elysia/config.py:874-893` — `load_lm()` function

**Step 1: Write `enhancer.py`**

The module must contain:

1. **XML loading** (same pattern as `ethical_guard.py`):
   ```python
   from pathlib import Path
   from functools import lru_cache

   PROMPTS_DIR = Path(__file__).parent / "prompts"

   @lru_cache(maxsize=None)
   def _load_file(filename: str) -> str:
       filepath = PROMPTS_DIR / filename
       try:
           return filepath.read_text(encoding="utf-8")
       except FileNotFoundError:
           return ""

   def _get_prompt(name: str) -> str:
       return _load_file(f"{name}.xml")
   ```

2. **DSPy Signatures**:

   `PromptEnhancerSignature(dspy.Signature)`:
   - Docstring: explains the task (improve a raw prompt following best practices)
   - InputFields: `raw_prompt: str`, `enhancement_guidelines: str` (XML content)
   - OutputField: `enhanced_prompt: str`

   `PromptRefinementSignature(dspy.Signature)`:
   - Docstring: explains the task (refine existing prompt based on suggestion, validate suggestion first)
   - InputFields: `current_prompt: str`, `user_suggestion: str`, `enhancement_guidelines: str`, `validation_criteria: str`
   - OutputFields: `is_valid_suggestion: bool`, `enhanced_prompt: str`, `feedback: str`

3. **Core functions**:

   ```python
   async def enhance_prompt(raw_prompt: str, lm: dspy.LM) -> dict:
       """First iteration: transform raw prompt into enhanced version."""
       enhancement_guidelines = _get_prompt("enhancement_system")
       with dspy.context(lm=lm):
           result = dspy.Predict(PromptEnhancerSignature)(
               raw_prompt=raw_prompt,
               enhancement_guidelines=enhancement_guidelines,
           )
       return {"enhanced_prompt": result.enhanced_prompt, "feedback": "", "error": ""}

   async def refine_prompt(current_prompt: str, suggestion: str, lm: dspy.LM) -> dict:
       """Subsequent iterations: validate suggestion then refine."""
       enhancement_guidelines = _get_prompt("enhancement_system")
       validation_criteria = _get_prompt("validation_criteria")
       with dspy.context(lm=lm):
           result = dspy.Predict(PromptRefinementSignature)(
               current_prompt=current_prompt,
               user_suggestion=suggestion,
               enhancement_guidelines=enhancement_guidelines,
               validation_criteria=validation_criteria,
           )
       if result.is_valid_suggestion:
           return {"enhanced_prompt": result.enhanced_prompt, "feedback": "", "error": ""}
       else:
           return {"enhanced_prompt": "", "feedback": result.feedback, "error": ""}
   ```

**Step 2: Verify module imports**

```bash
cd /opt/athena/elysia && source .venv/bin/activate
python -c "from elysia.prompt_enhancer.enhancer import enhance_prompt, refine_prompt; print('OK')"
```
Expected: `OK`

**Step 3: Commit**

```bash
cd /opt/athena/elysia && git add elysia/prompt_enhancer/enhancer.py
git commit -m "feat(prompt-enhancer): add DSPy signatures and core enhancement logic"
```

---

### Task 3: Backend — REST endpoint

**Goal:** Add the `/util/enhance_prompt` POST endpoint.

**Files:**
- Modify: `/opt/athena/elysia/elysia/api/api_types.py` (add `PromptEnhancementData` after line 98)
- Modify: `/opt/athena/elysia/elysia/api/routes/utils.py` (add endpoint at end of file)

**Step 1: Add Pydantic model**

In `/opt/athena/elysia/elysia/api/api_types.py`, after `FollowUpSuggestionsData` (line 98), add:

```python
class PromptEnhancementData(BaseModel):
    user_id: str
    conversation_id: str
    prompt: Optional[str] = None
    suggestion: str
```

**Step 2: Add endpoint**

In `/opt/athena/elysia/elysia/api/routes/utils.py`:

1. Add to imports at top:
   ```python
   from elysia.api.api_types import (
       DebugData,
       FollowUpSuggestionsData,
       NERData,
       PromptEnhancementData,
       TitleData,
   )
   from elysia.prompt_enhancer.enhancer import enhance_prompt, refine_prompt
   ```

2. Add endpoint at end of file (after the `/debug` endpoint):
   ```python
   @router.post("/enhance_prompt")
   async def enhance_prompt_endpoint(
       data: PromptEnhancementData,
       user_manager: UserManager = Depends(get_user_manager),
   ):
       logger.debug(f"/enhance_prompt API request received")
       logger.debug(f"User ID: {data.user_id}, has existing prompt: {data.prompt is not None}")

       if user_manager.check_tree_timeout(data.user_id, data.conversation_id):
           return JSONResponse(
               content={"enhanced_prompt": "", "feedback": "", "error": "Conversation has timed out"},
               status_code=408,
           )

       try:
           tree: Tree = await user_manager.get_tree(data.user_id, data.conversation_id)
           base_lm = tree.base_lm

           if data.prompt is None or data.prompt.strip() == "":
               result = await enhance_prompt(data.suggestion, base_lm)
           else:
               result = await refine_prompt(data.prompt, data.suggestion, base_lm)

           return JSONResponse(content=result, status_code=200)

       except Exception as e:
           logger.exception("Error in /enhance_prompt API")
           return JSONResponse(
               content={"enhanced_prompt": "", "feedback": "", "error": str(e)},
               status_code=200,
           )
   ```

**Step 3: Start backend on 8091 and test endpoint**

```bash
cd /opt/athena/elysia && source .venv/bin/activate && elysia start --host 0.0.0.0 --port 8091
```

In another terminal, test with curl:
```bash
curl -X POST http://127.0.0.1:8091/util/enhance_prompt \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test", "conversation_id": "test-conv", "prompt": null, "suggestion": "scrivi un riassunto di un documento"}'
```
Expected: JSON response with `enhanced_prompt` containing the improved prompt.

**Step 4: Commit**

```bash
cd /opt/athena/elysia && git add elysia/api/api_types.py elysia/api/routes/utils.py
git commit -m "feat(prompt-enhancer): add POST /util/enhance_prompt endpoint"
```

---

### Task 4: Frontend — API wrapper and TypeScript types

**Goal:** Create the fetch wrapper for the backend endpoint.

**Files:**
- Create: `/opt/athena/elysia-frontend/app/api/enhancePrompt.ts`

**Reference file:** `/opt/athena/elysia-frontend/app/api/getSuggestions.ts` — exact pattern to follow.

**Step 1: Write the API wrapper**

Create `/opt/athena/elysia-frontend/app/api/enhancePrompt.ts`:

```typescript
import { host } from "@/app/components/host";

export interface EnhancePromptPayload {
  enhanced_prompt: string;
  feedback: string;
  error: string;
}

export async function enhancePrompt(
  user_id: string,
  conversation_id: string,
  prompt: string | null,
  suggestion: string,
): Promise<EnhancePromptPayload> {
  const startTime = performance.now();
  try {
    const response = await fetch(`${host}/util/enhance_prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id,
        conversation_id,
        prompt,
        suggestion,
      }),
    });

    if (!response.ok) {
      return {
        enhanced_prompt: "",
        feedback: "",
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const data: EnhancePromptPayload = await response.json();
    return data;
  } catch (error) {
    return {
      enhanced_prompt: "",
      feedback: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `util/enhance_prompt took ${(performance.now() - startTime).toFixed(2)}ms`,
      );
    }
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
cd /opt/athena/elysia-frontend && npx tsc --noEmit app/api/enhancePrompt.ts 2>&1 | head -20
```
Expected: No errors (or only pre-existing unrelated errors).

**Step 3: Commit**

```bash
cd /opt/athena/elysia-frontend && git add app/api/enhancePrompt.ts
git commit -m "feat(prompt-enhancer): add enhancePrompt API wrapper"
```

---

### Task 5: Frontend — RouterContext changes (routing + prefill)

**Goal:** Add `"prompt-enhancer"` to valid pages and add `prefillPrompt` state for chat pre-fill.

**Files:**
- Modify: `/opt/athena/elysia-frontend/app/components/contexts/RouterContext.tsx`

**Step 1: Update the context type and state**

In `RouterContext.tsx`:

1. **Update the context type** (line 9-17) — add `prefillPrompt` and `setPrefillPrompt`:
   ```typescript
   export const RouterContext = createContext<{
     currentPage: string;
     changePage: (
       page: string,
       params?: Record<string, any>,
       replace?: boolean,
       guarded?: boolean
     ) => void;
     prefillPrompt: string;
     setPrefillPrompt: (prompt: string) => void;
   }>({
     currentPage: "chat",
     changePage: () => { },
     prefillPrompt: "",
     setPrefillPrompt: () => { },
   });
   ```

2. **Add state in RouterProvider** (after line 23):
   ```typescript
   const [prefillPrompt, setPrefillPrompt] = useState<string>("");
   ```

3. **Add `"prompt-enhancer"` to validPages** (line 99-109):
   ```typescript
   const validPages = [
     "chat",
     "data",
     "collection",
     "settings",
     "eval",
     "feedback",
     "elysia",
     "display",
     "reportistica",
     "prompt-enhancer",
   ];
   ```

4. **Update the Provider value** (line 129-133):
   ```typescript
   <RouterContext.Provider
     value={{
       currentPage,
       changePage,
       prefillPrompt,
       setPrefillPrompt,
     }}
   >
   ```

**Step 2: Verify build**

```bash
cd /opt/athena/elysia-frontend && npm run build 2>&1 | tail -20
```
Expected: Build succeeds (there may be warnings but no errors related to RouterContext).

**Step 3: Commit**

```bash
cd /opt/athena/elysia-frontend && git add app/components/contexts/RouterContext.tsx
git commit -m "feat(prompt-enhancer): add prompt-enhancer route and prefillPrompt to RouterContext"
```

---

### Task 6: Frontend — Sidebar menu item

**Goal:** Add the Prompt Enhancer entry to the sidebar navigation.

**Files:**
- Modify: `/opt/athena/elysia-frontend/app/components/navigation/SidebarComponent.tsx`

**Step 1: Add icon import**

Add to imports at top of file (after the `TbReportAnalytics` import on line 27):
```typescript
import { MdAutoFixHigh } from "react-icons/md";
```

**Step 2: Add menu item**

In the `_items` array (after the Reportistica item, line 108-112), add:
```typescript
{
  title: "Prompt Enhancer",
  mode: ["prompt-enhancer"],
  icon: <MdAutoFixHigh />,
  onClick: () => changePage("prompt-enhancer", {}, true, unsavedChanges),
},
```

**Step 3: Verify the sidebar renders**

Start frontend on 3091, navigate to the app, check sidebar shows "Prompt Enhancer" with the icon.

**Step 4: Commit**

```bash
cd /opt/athena/elysia-frontend && git add app/components/navigation/SidebarComponent.tsx
git commit -m "feat(prompt-enhancer): add Prompt Enhancer menu item to sidebar"
```

---

### Task 7: Frontend — PromptEnhancerPage component

**Goal:** Build the main page component with two textareas, four buttons, and history navigation.

**Files:**
- Create: `/opt/athena/elysia-frontend/app/pages/PromptEnhancerPage.tsx`

**Reference files:**
- `/opt/athena/elysia-frontend/app/pages/ReportisticaPage.tsx` — page component pattern
- `/opt/athena/elysia-frontend/app/pages/ChatPage.tsx` — layout and styling patterns

**Step 1: Write the page component**

Create `/opt/athena/elysia-frontend/app/pages/PromptEnhancerPage.tsx`.

The component must:

1. **Imports**: React, useState, useContext, RouterContext, SessionContext, Button (from `@/components/ui/button`), enhancePrompt API, icons (MdAutoFixHigh, IoArrowBack, IoTrash, IoArrowForward, IoArrowBack for nav, IoSend or similar)

2. **State**:
   ```typescript
   const [upperText, setUpperText] = useState("");        // enhanced prompt
   const [lowerText, setLowerText] = useState("");        // suggestion / raw prompt
   const [history, setHistory] = useState<string[]>([]);  // version history
   const [historyIndex, setHistoryIndex] = useState(-1);  // current position (-1 = no history)
   const [isLoading, setIsLoading] = useState(false);     // loading state for Migliora
   ```

3. **Context**:
   ```typescript
   const { changePage, setPrefillPrompt } = useContext(RouterContext);
   const { userId, conversationId } = useContext(SessionContext); // check actual field names
   ```

4. **Handler functions**:

   `handleMigliora`:
   - If `isLoading`, return
   - Set `isLoading = true`
   - Call `enhancePrompt(userId, conversationId, upperText || null, lowerText)`
   - If response has `enhanced_prompt`: set `upperText`, append to `history`, update `historyIndex`
   - If response has `feedback`: set `lowerText` to the feedback
   - If response has `error`: show toast or display error
   - Set `isLoading = false`

   `handleUsa`:
   - `setPrefillPrompt(upperText)`
   - `changePage("chat", {}, true)`

   `handleAbbandona`:
   - `changePage("chat", {}, true)`

   `handlePulisci`:
   - `setUpperText("")`
   - `setHistory([])`
   - `setHistoryIndex(-1)`

   `handleHistoryPrev`:
   - If `historyIndex > 0`: decrement, set `upperText` to `history[historyIndex - 1]`

   `handleHistoryNext`:
   - If `historyIndex < history.length - 1`: increment, set `upperText` to `history[historyIndex + 1]`

   `handleUpperTextChange`:
   - Update `upperText`
   - If `historyIndex >= 0`: update `history[historyIndex]` with new text

5. **Layout** (Tailwind, dark theme, matching existing pages):
   ```
   <div className="flex flex-col w-full h-full gap-4">
     <!-- Header -->
     <p className="text-primary text-xl font-heading font-bold">Prompt Enhancer</p>

     <!-- Upper section (80%) -->
     <div className="flex flex-col flex-[4] min-h-0">
       <div className="flex justify-between mb-2">
         <Button onClick={handlePulisci}>Pulisci</Button>
         <Button onClick={handleUsa} disabled={!upperText}>Usa</Button>
       </div>
       <textarea className="flex-1 w-full resize-none bg-background_alt border border-foreground_alt rounded-xl p-4 text-primary text-sm outline-none"
         value={upperText}
         onChange={handleUpperTextChange}
         placeholder="Il prompt migliorato apparirà qui..."
       />
       {history.length >= 2 && (
         <div className="flex justify-center items-center gap-2 mt-2">
           <Button size="icon" variant="ghost" onClick={handleHistoryPrev} disabled={historyIndex <= 0}>◀</Button>
           <span className="text-sm text-secondary">{historyIndex + 1} / {history.length}</span>
           <Button size="icon" variant="ghost" onClick={handleHistoryNext} disabled={historyIndex >= history.length - 1}>▶</Button>
         </div>
       )}
     </div>

     <!-- Lower section (20%) -->
     <div className="flex flex-col flex-1 min-h-0">
       <div className="flex justify-between mb-2">
         <Button variant="outline" onClick={handleAbbandona}>Abbandona</Button>
         <Button onClick={handleMigliora} disabled={!lowerText.trim() || isLoading}>
           {isLoading ? "Elaborazione..." : "Migliora"}
         </Button>
       </div>
       <textarea className="flex-1 w-full resize-none bg-background_alt border border-foreground_alt rounded-xl p-4 text-primary text-sm outline-none"
         value={lowerText}
         onChange={(e) => setLowerText(e.target.value)}
         placeholder="Scrivi qui il tuo prompt o i suggerimenti di modifica..."
       />
     </div>
   </div>
   ```

**Important notes:**
- Check `SessionContext` for exact field names for user_id and conversation_id — they may be accessed differently (e.g., via `useAuthUserId` hook at `/opt/athena/elysia-frontend/hooks/useAuthUserId.ts`)
- Use `"use client"` directive at top
- Use `fade-in` className on the outer div for animation consistency

**Step 2: Verify TypeScript compiles**

```bash
cd /opt/athena/elysia-frontend && npx tsc --noEmit 2>&1 | grep -i "PromptEnhancer" | head -10
```
Expected: No errors related to PromptEnhancerPage.

**Step 3: Commit**

```bash
cd /opt/athena/elysia-frontend && git add app/pages/PromptEnhancerPage.tsx
git commit -m "feat(prompt-enhancer): add PromptEnhancerPage component with dual textarea layout and history"
```

---

### Task 8: Frontend — Wire page into router

**Goal:** Add PromptEnhancerPage to the conditional render in `app/page.tsx`.

**Files:**
- Modify: `/opt/athena/elysia-frontend/app/page.tsx`

**Step 1: Add import**

After the `ReportisticaPage` import (line 14), add:
```typescript
import PromptEnhancerPage from "./pages/PromptEnhancerPage";
```

**Step 2: Add conditional render**

After the reportistica line (line 32), add:
```typescript
{currentPage === "prompt-enhancer" && <PromptEnhancerPage />}
```

**Step 3: Verify the page renders**

Start frontend on 3091, navigate to `/?page=prompt-enhancer`. The page should show the two textareas and buttons.

**Step 4: Commit**

```bash
cd /opt/athena/elysia-frontend && git add app/page.tsx
git commit -m "feat(prompt-enhancer): wire PromptEnhancerPage into SPA router"
```

---

### Task 9: Frontend — Chat pre-fill in QueryInput

**Goal:** Make QueryInput read `prefillPrompt` from RouterContext and populate the input.

**Files:**
- Modify: `/opt/athena/elysia-frontend/app/components/chat/QueryInput.tsx`

**Step 1: Add context import and consumption**

In `QueryInput.tsx`:

1. Add import (after existing imports):
   ```typescript
   import { RouterContext } from "../contexts/RouterContext";
   ```

2. Inside the component (after line 37), add:
   ```typescript
   const { prefillPrompt, setPrefillPrompt } = useContext(RouterContext);
   ```

3. Add a `useEffect` to consume the prefill (after the existing useEffects):
   ```typescript
   useEffect(() => {
     if (prefillPrompt) {
       setQuery(prefillPrompt);
       setPrefillPrompt("");
     }
   }, [prefillPrompt]);
   ```

**Step 2: Verify behavior**

1. Start frontend on 3091 + backend on 8091
2. Navigate to Prompt Enhancer page
3. Type a prompt, click "Migliora" (verify LLM call works)
4. Click "Usa" — should navigate to chat with the enhanced prompt in the input field

**Step 3: Commit**

```bash
cd /opt/athena/elysia-frontend && git add app/components/chat/QueryInput.tsx
git commit -m "feat(prompt-enhancer): add prefillPrompt consumption in QueryInput for chat pre-fill"
```

---

### Task 10: Integration test and polish

**Goal:** End-to-end verification of the complete flow.

**Step 1: Start parallel environment**

Terminal 1 (backend):
```bash
cd /opt/athena/elysia && source .venv/bin/activate && elysia start --host 0.0.0.0 --port 8091
```

Terminal 2 (frontend):
```bash
cd /opt/athena/elysia-frontend && env $(grep -v '^#' .env.test.local | xargs) npm run dev
```

**Step 2: Test complete flow**

1. Open `http://10.1.1.11:3091` in browser
2. Log in with test credentials (`demo@uni.local` / `demo123`)
3. Click "Prompt Enhancer" in sidebar — page loads
4. Type a raw prompt in lower textarea (e.g., "scrivi un email di presentazione")
5. Click "Migliora" — verify loading state, then enhanced prompt appears in upper textarea
6. Type a suggestion in lower textarea (e.g., "rendi il tono più formale e aggiungi un riferimento al progetto Athena")
7. Click "Migliora" — verify upper textarea updates with refined version
8. Use history navigation (prev/next) to compare versions
9. Edit upper textarea directly — verify history entry updates
10. Click "Pulisci" — verify upper textarea and history clear
11. Create a new enhanced prompt, click "Usa" — verify navigation to chat with prompt pre-filled
12. Click "Abbandona" from Prompt Enhancer — verify return to chat without side effects

**Step 3: Test edge cases**

- Click "Migliora" with empty lower textarea — button should be disabled
- Click "Usa" with empty upper textarea — button should be disabled
- Submit an invalid suggestion (e.g., just "ciao") — verify feedback appears in lower textarea
- Rapid-click "Migliora" during loading — verify no duplicate calls

**Step 4: Verify production build**

```bash
cd /opt/athena/elysia-frontend && npm run build
```
Expected: Build succeeds with no new errors.

**Step 5: Final commit**

```bash
cd /opt/athena/elysia-frontend && git add -A && git status
# Only commit if there are polish fixes
git commit -m "feat(prompt-enhancer): integration polish and fixes"
```

---

## Task Dependency Graph

```
Task 0 (test env) ─────────────────────────────────────────┐
                                                            │
Task 1 (XML files) → Task 2 (enhancer.py) → Task 3 (endpoint) ──→ Task 10 (integration)
                                                            │
Task 4 (API wrapper) ──────────────────────────────────────┤
Task 5 (RouterContext) → Task 7 (page) → Task 8 (router) ─┤
Task 6 (sidebar) ──────────────────────────────────────────┤
Task 5 (RouterContext) → Task 9 (QueryInput prefill) ──────┘
```

**Parallel tracks:**
- Backend (Tasks 1→2→3) and Frontend (Tasks 4, 5→6, 5→7→8, 5→9) can proceed in parallel
- Task 10 requires all other tasks complete
