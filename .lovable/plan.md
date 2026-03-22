

## Plan: Shorten Account Labels, Add Select-All/Delete for Admin, Fix eXp Watermark

### 1. Shorten account labels to last 4 digits only

**File: `src/pages/OutstandingWires.tsx`**

- Change section titles from `"Wells Fargo — XXXX-8022"` → `"8022"` and `"Wells Fargo — XXXX-3694"` → `"3694"` (lines 296, 313)
- For commercial/international dynamic titles, change from `"Commercial — WF-8022"` → `"Commercial — 8022"` (line 364)
- In account dropdown options (lines 1195-1201), show just the last 4 digits (e.g., `"8022"` instead of `"XXXX-8022"`)

### 2. Add Select All + bulk copy/paste/delete for admin users

**File: `src/pages/OutstandingWires.tsx`**

- Add a "Select All" keyboard shortcut (Ctrl+A) that selects all cells in the grid, gated behind `isAdmin`
- Add a "Delete Selected" option to the right-click context menu that deletes all selected rows (existing saved records), only visible for admin users
- The existing copy (Ctrl+C) and paste (Ctrl+V) already work for selections — just ensure they function properly when all rows are selected
- Add a "Select All" button in the grid toolbar for admin users

### 3. Fix eXp watermark visibility and add to Outstanding Wires

Currently the eXp watermark only exists on `NewWire.tsx` with `text-foreground/[0.03]` (3% opacity — nearly invisible).

**File: `src/pages/OutstandingWires.tsx`**
- Add the same eXp watermark background `div` as NewWire uses
- Increase opacity from `0.03` to `0.04` or `0.05` so it's subtly visible

**File: `src/pages/NewWire.tsx`**
- Also increase opacity on the existing watermark to match

### Files to modify

| File | Change |
|------|--------|
| `src/pages/OutstandingWires.tsx` | Shorten account labels; add Ctrl+A select-all and bulk delete for admin; add eXp watermark |
| `src/pages/NewWire.tsx` | Increase watermark opacity |

