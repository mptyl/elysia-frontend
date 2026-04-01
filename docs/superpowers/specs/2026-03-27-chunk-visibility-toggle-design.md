# Chunk Visibility Toggle — Design Spec

**Date**: 2026-03-27
**Author**: Leonardo Porcacchia
**Status**: Approved

## Overview

Add a toggle (eye icon) to hide/show RAG result chunks in chat responses. The toggle appears in the tab row of merged displays (alongside Document/Source Code icons), aligned to the right. Citation bubbles [1][2] in the response text are unaffected.

## Requirements

- Eye icon (`LuEye` / `LuEyeOff`) in the MergeDisplays tab row, right-aligned
- Click toggles visibility of the chunk result box (DocumentDisplay and similar)
- Slide up/down animation, 300ms, `ease-in-out`
- Tab row with the eye icon stays always visible (even when chunks are hidden)
- State is global: toggling on one response affects all responses
- New RAG responses inherit the current toggle state
- Citation bubbles [1][2] in text always remain visible
- State persists within the session only (no persistence after refresh)
- No backend changes required

## State

- `chunksVisible: boolean` (default: `true`) added to `ConversationContext`
- `setChunksVisible` function exposed via the context
- Session-only: resets to `true` on page refresh

## UI

- Icon: `LuEye` (visible) / `LuEyeOff` (hidden) from `lucide-react`
- Position: same row as collection tabs in `MergeDisplays`, pushed right with `ml-auto`
- Style: `text-secondary`, hover `text-primary` (consistent with existing icons)

## Animation

- Wrapper `div` around the result box content (below the tab row)
- CSS: `overflow-hidden`, `transition-all duration-300 ease-in-out`
- Visible state: `max-height` from content + `opacity-100`
- Hidden state: `max-height: 0` + `opacity-0`
- Uses existing Tailwind transition utilities

## Files Modified

| File | Change |
|------|--------|
| `app/components/contexts/ConversationContext.tsx` | Add `chunksVisible` state + `setChunksVisible` to context |
| `app/components/chat/MergeDisplays.tsx` | Add eye icon in tab row, read `chunksVisible` from context |
| `app/components/chat/RenderChat.tsx` | Wrap result messages in animated container controlled by `chunksVisible` |

## Scope Exclusions

- Citation bubbles [1][2] are not affected
- No backend changes
- No persistence beyond current session
- No per-query granularity (global toggle only)

## Future Considerations

- Persistence (localStorage or user profile) can be added later
- Per-query toggle (Approach B) could be layered on if needed
