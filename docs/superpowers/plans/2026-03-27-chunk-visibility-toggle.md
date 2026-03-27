# Chunk Visibility Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an eye icon toggle to hide/show RAG result chunks in chat responses, with slide animation.

**Architecture:** Global `chunksVisible` boolean state in ConversationContext. Eye icon in MergeDisplays tab row (and single-result row). Animated wrapper around result content using CSS transitions.

**Tech Stack:** React, TypeScript, Tailwind CSS, lucide-react (`LuEye`/`LuEyeOff`)

---

### Task 1: Add `chunksVisible` state to ConversationContext

**Files:**
- Modify: `app/components/contexts/ConversationContext.tsx`

- [ ] **Step 1: Add `chunksVisible` and `setChunksVisible` to the context type definition**

In `app/components/contexts/ConversationContext.tsx`, add to the context type (after line 102):

```typescript
  chunksVisible: boolean;
  setChunksVisible: (visible: boolean) => void;
```

- [ ] **Step 2: Add default values**

In the `createContext` default values object (after line 136):

```typescript
  chunksVisible: true,
  setChunksVisible: () => { },
```

- [ ] **Step 3: Add state declaration in the provider**

In `ConversationProvider`, after the existing state declarations (after line 164):

```typescript
const [chunksVisible, setChunksVisible] = useState(true);
```

- [ ] **Step 4: Expose in provider value**

In the provider value object (after line 1024, before `handleWebsocketMessage`):

```typescript
    chunksVisible,
    setChunksVisible,
```

- [ ] **Step 5: Verify build passes**

Run: `cd /opt/athena/elysia-frontend && npx next build --webpack 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
cd /opt/athena/elysia-frontend && git add app/components/contexts/ConversationContext.tsx
git commit -m "feat(chunk-toggle): add chunksVisible state to ConversationContext"
```

---

### Task 2: Add eye icon toggle to MergeDisplays (merged results)

**Files:**
- Modify: `app/components/chat/MergeDisplays.tsx`

- [ ] **Step 1: Add imports**

In `app/components/chat/MergeDisplays.tsx`, replace line 1:

```typescript
import React, { useContext, useRef, useState } from "react";
```

Add after line 5:

```typescript
import { LuEye, LuEyeOff } from "lucide-react";
import { ConversationContext } from "../contexts/ConversationContext";
```

- [ ] **Step 2: Read chunksVisible from context**

Inside the `MergeDisplays` component, after line 29 (`const [activeTab, ...]`):

```typescript
  const { chunksVisible, setChunksVisible } = useContext(ConversationContext);
  const contentRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 3: Add eye icon to tab row**

In the tab row `div` (line 37), add the eye icon button after the scrollable tabs div (after line 60, before the closing `</div>` of the tab row):

```tsx
        <button
          onClick={() => setChunksVisible(!chunksVisible)}
          className="ml-auto flex-shrink-0 p-1 text-secondary hover:text-primary transition-colors duration-200"
          title={chunksVisible ? "Hide chunks" : "Show chunks"}
        >
          {chunksVisible ? <LuEye size={16} /> : <LuEyeOff size={16} />}
        </button>
```

- [ ] **Step 4: Wrap content area with animated container**

Replace the content div (lines 62-78) with:

```tsx
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: chunksVisible ? contentRef.current?.scrollHeight ?? 1000 : 0,
          opacity: chunksVisible ? 1 : 0,
        }}
      >
        <div className="mt-2 flex flex-col gap-4">
          {payloadsToMerge.map((payload, idx) => {
            const tabValue = `${baseKey}-tab-${idx}`;
            if (activeTab !== tabValue) return null;

            return (
              <div key={`${baseKey}-content-${idx}`}>
                <RenderDisplay
                  payload={payload}
                  index={idx}
                  handleResultPayloadChange={handleResultPayloadChange}
                  messageId={messageId}
                />
              </div>
            );
          })}
        </div>
      </div>
```

- [ ] **Step 5: Verify build passes**

Run: `cd /opt/athena/elysia-frontend && npx next build --webpack 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
cd /opt/athena/elysia-frontend && git add app/components/chat/MergeDisplays.tsx
git commit -m "feat(chunk-toggle): add eye icon toggle to MergeDisplays"
```

---

### Task 3: Add eye icon toggle to single (non-merged) result messages

**Files:**
- Modify: `app/components/chat/RenderChat.tsx`

- [ ] **Step 1: Add imports**

In `app/components/chat/RenderChat.tsx`, add to the existing imports:

```typescript
import { LuEye, LuEyeOff } from "lucide-react";
import { ConversationContext } from "../contexts/ConversationContext";
```

- [ ] **Step 2: Read chunksVisible from context**

Inside the `RenderChat` component, add after the existing `useContext(ChatContext)` call (around line 93):

```typescript
  const { chunksVisible, setChunksVisible } = useContext(ConversationContext);
```

- [ ] **Step 3: Wrap single result messages with toggle and animation**

Replace the single result rendering block (lines 348-368) with:

```tsx
                        {/* Result Messages */}
                        {item.type !== "merged_result" &&
                          message.type === "result" && (
                            <div className="w-full flex flex-col justify-start items-start gap-3">
                              <div className="flex items-center gap-2 w-full">
                                {(message.payload as ResultPayload).code && (
                                  <CodeDisplay
                                    payload={[message.payload as ResultPayload]}
                                    merged={false}
                                    handleViewChange={handleViewChange}
                                  />
                                )}
                                <button
                                  onClick={() => setChunksVisible(!chunksVisible)}
                                  className="ml-auto flex-shrink-0 p-1 text-secondary hover:text-primary transition-colors duration-200"
                                  title={chunksVisible ? "Hide chunks" : "Show chunks"}
                                >
                                  {chunksVisible ? <LuEye size={16} /> : <LuEyeOff size={16} />}
                                </button>
                              </div>
                              <div
                                className="w-full overflow-hidden transition-all duration-300 ease-in-out"
                                style={{
                                  maxHeight: chunksVisible ? 2000 : 0,
                                  opacity: chunksVisible ? 1 : 0,
                                }}
                              >
                                <RenderDisplay
                                  payload={message.payload as ResultPayload}
                                  index={index}
                                  messageId={message.id}
                                  handleResultPayloadChange={
                                    handleResultPayloadChange
                                  }
                                />
                              </div>
                            </div>
                          )}
```

- [ ] **Step 4: Verify build passes**

Run: `cd /opt/athena/elysia-frontend && npx next build --webpack 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
cd /opt/athena/elysia-frontend && git add app/components/chat/RenderChat.tsx
git commit -m "feat(chunk-toggle): add eye icon toggle to single result messages"
```

---

### Task 4: Build, deploy, and verify

**Files:**
- No code changes — build and deploy only

- [ ] **Step 1: Run static build**

```bash
cd /opt/athena/elysia-frontend && npm run assemble
```

Expected: `Export completed successfully!`

- [ ] **Step 2: Restart backend**

```bash
pkill -f "elysia start"; sleep 2
cd /opt/athena/elysia && source .venv/bin/activate && nohup elysia start --host 0.0.0.0 > /tmp/elysia.log 2>&1 &
```

- [ ] **Step 3: Verify backend is up**

```bash
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:8090
```

Expected: `200`

- [ ] **Step 4: Manual verification checklist**

Open `http://10.1.1.11:8090` and verify:
- [ ] Ask a RAG question — eye icon appears in the result row (right-aligned)
- [ ] Click eye icon — chunks slide up and hide (300ms), icon changes to `LuEyeOff`
- [ ] Click again — chunks slide down and show, icon changes back to `LuEye`
- [ ] Ask another RAG question — new response inherits the current toggle state
- [ ] Citation bubbles [1][2] in text remain visible regardless of toggle
- [ ] Works in both dark and light mode
