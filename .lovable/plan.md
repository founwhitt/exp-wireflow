

## Combined Plan: Outstanding Wires + Send Wire Instructions + Expected Wires Enhancements

This adds three new items to the existing plan.

---

### Part 1 — Outstanding Wires: Tab Spacing & Collapse/Expand Controls
*(unchanged from before)*

- `TabsList` to `w-full`, `flex-1` on each `TabsTrigger`.
- `collapsedAll` state with Collapse All / Expand All toolbar buttons.
- `forceExpanded` prop on `CollapsibleAccountSection`.

---

### Part 2 — Outstanding Wires: Dynamic Accounts & Statuses with Admin Management
*(unchanged from before)*

- New `ow_config` table with RLS (admin write, authenticated read).
- Seed WF-8022, WF-3694, WF-9691 accounts + initial statuses.
- New `useOwConfig` hook for CRUD.
- Commercial & International tabs use dynamic account selector.
- Admin-only "Manage Options" dialog for accounts and statuses.

---

### Part 3 — Remove Manual Entry from Send Wire Instructions (NEW)

**File: `src/pages/NewWire.tsx`**

- Remove the "Manual Entry" toggle button and the entire manual entry form section.
- Remove the `entryMode` state, `manualData` state, and `resolvedData` manual branch.
- Keep only TID Lookup mode — the page becomes lookup-only.
- Remove the "Save to Dashboard Only" switch (`skipEmail` / `handleSaveOnly`) since manual-to-dashboard is moving to the Expected Wires page instead.

---

### Part 4 — Add Manual Entry Directly to Expected Wires (NEW)

**File: `src/pages/Dashboard.tsx`**

- Add an "Add Entry" button in the toolbar area (next to Export).
- Clicking it opens a dialog with a form for manually creating a wire record: TID, department, customer name, property address, agent, balance due, and other key fields.
- On submit, inserts into `wire_records` with status "Pending" and no email sent.
- The new record appears in the table immediately.

This replaces the manual entry + "Save to Dashboard Only" flow that was on the Send Wire Instructions page.

---

### Part 5 — Payload Section on Expected Wires (NEW)

**Goal**: Separate payload payments from regular wire payments on the Expected Wires dashboard.

**Database**: The `wire_records` table already has a `department` column. Payload records will use a new department value.

**File: `src/lib/department-config.ts`**
- Add "Payload" as a department type (no WF account needed since it skips wire instructions).

**File: `src/pages/Dashboard.tsx`**
- Add a **Payload** section header row in the table (similar to how WF 3694 / WF 8022 sections work), filtering records where `department = 'Payload'`.
- Payload records are visually separated with their own colored header (e.g. purple/indigo).
- The existing WF 3694 / WF 8022 / Other groupings exclude Payload records.
- The manual "Add Entry" dialog (from Part 4) includes a "Payload" option in the department dropdown, which skips wire-instruction-specific fields.

---

### Files Summary

| Action | File |
|--------|------|
| Modify | `src/pages/NewWire.tsx` — remove manual entry mode |
| Modify | `src/pages/Dashboard.tsx` — add manual entry dialog + Payload section |
| Modify | `src/lib/department-config.ts` — add Payload department |
| Create | `src/hooks/useOwConfig.ts` |
| Modify | `src/pages/OutstandingWires.tsx` — tab spacing, collapse/expand, dynamic dropdowns, admin panel |
| Migration | `ow_config` table + seed data |

---

*Plan is still open for more items. Let me know what to add or change, or approve to start building.*

