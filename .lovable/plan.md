

## Plan: Spread Nav + Persist Collapse + Dynamic Accounts for Commercial/International

### 1. Spread navigation links across header bar

**File: `src/components/AppNav.tsx`**

Change the `<nav>` element (line 27) from `flex items-center gap-1` to `flex-1 flex items-center justify-center gap-4`. This distributes links evenly between the logo and user controls instead of clustering them on the left.

---

### 2. Persist collapse/expand state in Outstanding Wires

**File: `src/pages/OutstandingWires.tsx`**

In `CollapsibleAccountSection` (line 346):
- Replace `useState(false)` with initialization from `localStorage` using key `ow-expanded-${title}`
- On toggle, persist value to `localStorage`
- When "Collapse All" / "Expand All" buttons are clicked (lines 232-237), also write to localStorage for all active section keys

---

### 3. Remove hardcoded account dropdown from Commercial & International tabs

Currently Commercial and International tabs render a single `CollapsibleAccountSection` with `defaultAccount="WF-8022"` (lines 309-330). The Account column shows a hardcoded dropdown with only WF-8022 and WF-3694.

**Changes in `src/pages/OutstandingWires.tsx`:**

- For Commercial and International tabs, group records by their `wf_account` value and render a separate `CollapsibleAccountSection` per account (similar to how Realty splits into 8022/3694)
- The Account column dropdown in these tabs should pull options from the `ow_config` table (accounts with `config_type === "account"`) instead of hardcoded values
- When accounting creates a new row, the account is set at entry time from the dynamic dropdown
- Non-accounting users see the account as read-only text

---

### 4. Allow accounting to manage accounts in Outstanding Wires and Wire Instructions

**File: `src/pages/OutstandingWires.tsx`:**
- Add a "Manage Options" button (visible to accounting/admin) that opens a dialog to add/remove/edit account options in the `ow_config` table
- This already exists as a pattern in the codebase via `useOwConfig`, `useCreateOwConfig`, `useUpdateOwConfig`, `useDeleteOwConfig` hooks

**File: `src/pages/AdminWireInstructions.tsx`:**
- Add a similar "Manage Accounts" section or button that lets accounting/admin users manage the same `ow_config` account entries, so account options are consistent across both Outstanding Wires and Wire Instructions pages

---

### Files to modify

| File | Change |
|------|--------|
| `src/components/AppNav.tsx` | Add `flex-1 justify-center gap-4` to nav element |
| `src/pages/OutstandingWires.tsx` | localStorage persistence for collapse state; dynamic account grouping for Commercial/International; Manage Options dialog for accounting |
| `src/pages/AdminWireInstructions.tsx` | Add Manage Accounts section using ow_config |

### Technical details

- `ow_config` table already stores accounts (`config_type = "account"`) and has full CRUD hooks in `src/hooks/useOwConfig.ts`
- The `useOwAccounts()` hook returns active account options — will be used for dynamic dropdowns
- Commercial/International sections will use `useMemo` to group `filtered` records by `wf_account`, then render one `CollapsibleAccountSection` per group plus a catch-all for new entries
- localStorage keys follow pattern `ow-expanded-{sectionTitle}` for collapse persistence

