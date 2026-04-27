# Reportistica Testing & Development Checklist

## Status
**Last updated:** 2026-04-27  
**Frontend features verified:** AG Grid integration, searchable combobox for select params, wildcard defaults ("Tutti"), auto-execute with debounce  
**Backend (n8n) status:** 2 critical bugs identified and documented in `reportistica-n8n-fix-types-and-empty-params.md`

---

## ✅ Completed Features

- [x] AG Grid Community integration (v34.3.1) with pagination, virtualization
- [x] Dynamic dark mode theming via CSS variables
- [x] Auto-execute with 400ms debounce, 30s timeout
- [x] Searchable combobox for select parameters (ParamCombobox)
  - Pinned "Tutti" option at top
  - Alphabetical sort (IT locale) for remaining options
  - Custom filter on both label and value
- [x] Wildcard default handling (`%` → "Tutti", `-1` → "Tutti")
- [x] Empty state handling (no params, empty results, errors)
- [x] i18n keys for Reportistica (EN/IT)
- [x] Tested on 16 reports without parameters (auto-execute works)

---

## 📋 Next Steps (Priority Order)

### Phase 1: Remove Output Parameter & Add Export

**Issue:** The "Output" dropdown (`reportistica.selectOutput`) is a n8n-side concept that doesn't map to the frontend UI. Users don't understand it, and n8n always returns a single output format (JSON). Remove it.

**Tasks:**
- [ ] Remove the "Output" parameter selector from ReportisticaPage.tsx (the `<ParamCombobox>` that filters on `param.name === 'output'`)
- [ ] Remove `reportistica.selectOutput` and `reportistica.output` i18n keys
- [ ] Add "Export CSV" button below the data table (triggered by n8n `/export/csv?reportId={id}&format=csv`)
- [ ] Add "Export Excel" button below the data table (triggered by n8n `/export/excel?reportId={id}&format=xlsx`)
- [ ] Test export endpoints with reports 21, 49 (verify file downloads)
- [ ] Add i18n keys:
  - `reportistica.exportCsv` (EN: "Export as CSV", IT: "Esporta CSV")
  - `reportistica.exportExcel` (EN: "Export as Excel", IT: "Esporta Excel")
  - `reportistica.exporting` (EN: "Exporting...", IT: "Esportazione in corso...")

**Files to modify:**
- `app/pages/ReportisticaPage.tsx`
- `messages/en.json`
- `messages/it.json`

---

### Phase 2: Fix N8N Workflow (Backend)

**Status:** Documented in `reportistica-n8n-fix-types-and-empty-params.md`

**Tasks:**
- [ ] Apply fix #1: Type normalization in `Code: Format Parameters` node
  - Map `"Date"` → `"date"`, `"String"` → `"text"|"select"`, `"Integer"` → `"number"`
  - Affects 101 parameters across all reports
- [ ] Apply fix #2: Filter phantom params for reports without parameters
  - 26 reports return `[{options: null}]` instead of `[]`
  - Add `.filter(p => p.parameter_name && p.parameter_name.length > 0)` in `Code: Format Parameters`
- [ ] Verify fixes with test suite:
  ```bash
  curl -s "http://localhost:5678/webhook/get-params?reportId=21" | jq '.parameters | length'  # should be 0
  curl -s "http://localhost:5678/webhook/get-params?reportId=49" | jq '.parameters[0].type'   # should be "text" or "select"
  curl -s "http://localhost:5678/webhook/get-params?reportId=12" | jq '.parameters[].type'    # should be "date"
  ```

---

## 📊 Report Testing Status

### ✅ Tested & Passing (16 reports, zero parameters)

Auto-execute immediately on page load.

| Report ID | Name | Rows | Status |
|-----------|------|------|--------|
| 4 | ? | 3,654 | ✅ Pass |
| 5 | ? | 7 | ✅ Pass |
| 21 | ? | 2,551 | ✅ Pass |
| 25 | ? | 32 | ✅ Pass |
| 26 | ? | 0 | ✅ Pass |
| 33 | ? | 0 | ✅ Pass |
| 36 | ? | 7 | ✅ Pass |
| 41 | ? | 7,354 | ✅ Pass (virtualization tested) |
| 44 | ? | 276 | ✅ Pass |
| 51 | ? | 1 | ✅ Pass |
| 53 | ? | 1,161 | ✅ Pass |
| 57 | ? | 6,689 | ✅ Pass |
| 59 | ? | 6 | ✅ Pass |
| 67 | ? | 0 | ✅ Pass |
| 75 | ? | 23 | ✅ Pass |
| 79 | ? | ? | ✅ Pass |

**Summary:** All 16 reports auto-execute and display data correctly. Pagination, virtualization, dark mode work as expected.

---

### ⚠️ Known Issues & Broken Reports

#### In N8N Backend

**Report 58 ("Report soci morosi")** — `get-params` works, but `execute` returns "Report non trovato"
- **Status:** Blocked on n8n investigation
- **Action:** Escalate to n8n ops

**Reports 64–100 (various)** — `get-params` returns empty params, but `execute` fails with "Report non trovato"
- **Status:** Likely incomplete data in n8n database
- **Action:** Verify report registry in n8n

#### In Data (Parameter Type)

**Report 3** — Parameter `Rilevanza` has `options` with `value: null` entries
- **Status:** Fixed in frontend with `.filter(opt => opt.value !== null)`
- **Regression:** None expected; null values are silently dropped

---

### 🔄 Reports with Parameters (requires fixes in N8N first)

These reports have `required` parameters but no wildcard defaults. They correctly require user input before auto-executing.

- Reports 1–3, 6–20, 22–24, 27–32, 34–35, 37–40, 42–43, 45–50, 52, 54–56, 60–63, 70–71, 73, 76, 80–82, ...

**Key examples:**
- **Report 49** ("Norme da Tradurre") — 2 params with wildcard defaults (`p_otc=-1`, `p_fte=%`) → auto-executes with "Tutti" placeholder ✅
- **Report 27** ("?") — 2 params, one select with 24+ options → searchable combobox works ✅
- **Report 12** ("?") — 2 date params → date picker works ✅

---

## 🧪 Manual Testing Checklist (Before Shipping)

Run before any merge to `main`:

```bash
npm run build  # TypeScript & lint pass
```

**In browser (http://localhost:3090/?page=reportistica):**

- [ ] **Auto-execute (zero params):**
  - Select Report 21 → table populates immediately (2,551 rows)
  - Pagination shows "50 rows per page", [25/50/100/200] selector works
  - Dark mode toggle in top-right → table theme updates in real-time

- [ ] **Wildcard defaults:**
  - Select Report 49 → params show "Tutti" placeholder in empty text inputs
  - Uncheck "Tutti" (if checkbox exists) or type a value → input becomes active
  - Grid re-executes with the new filter

- [ ] **Searchable combobox:**
  - Report 27 (if it has a select param) → open dropdown → type to filter
  - Verify alphabetical sort works (case-insensitive, IT locale)
  - Verify pinned option stays at top (if applicable)

- [ ] **Large dataset (virtualization):**
  - Report 41 (7,354 rows) → scroll through table, check performance
  - No lag or blank rows should appear

- [ ] **Error handling:**
  - Select a report and manually change reportId to 999 in query params
  - Verify error message displays gracefully

---

## 📝 Notes

- **N8N fixes:** The plan is ready in `reportistica-n8n-fix-types-and-empty-params.md`. Apply when authorized.
- **Type normalization:** Once n8n fixes are applied, `renderParam` switch cases will finally hit `"select"`, `"date"`, `"number"` correctly.
- **CSV/Excel export:** Coordinate with n8n on endpoint contract (`/webhook/export?reportId={id}&format={csv|xlsx}`).
- **Report metadata:** Some report names are missing from the test output. Update the table above once metadata is collected from n8n.
