## Plan: Payload Toggle on Send Wire Instructions + Fix Manual Entry Form

### Changes

**1. Send Wire Instructions — Add "Payload Payment" toggle (`src/pages/NewWire.tsx`)**

- After deal data loads, add a checkbox/switch: "This is a Payload payment"
- When toggled ON:
  - Override department to "Payload" and wf_account to "N/A" in the saved record
  - Give the option to either skip the dispatch section entirely or actually send instructions
  - Show a simplified "Save to Expected Wires" button if they skip the option to disbatch the instructions
  - Record saves with status "Pending"
- This causes the record to land in the Payload section on the Expected Wires dashboard

**2. Fix Manual Entry dialog fields (`src/pages/Dashboard.tsx`)**

Current fields: TID, Department, Customer Name, Invoice #, Property Address, Agent Name, Balance Due, Notes

Replace with fields matching Expected Wires columns exactly:

- **TID** (keep)
- **Department** (keep — includes Payload option)
- **Customer Name** (keep, maps to "Customer" column)
- **Property Address** (keep)
- **Balance Due** (keep)
- **Agent Name** (keep)
- **Wiring Date** (add — date input)
- **Adjustments** (add — number input)
- **Notes** (keep — maps to Deal Notes)

Remove: Invoice #

"Sent By" auto-populates from logged-in user. Status auto-sets to "Pending". Wiring Institution is excluded.

### Files to modify

- `src/pages/NewWire.tsx` — add Payload toggle with conditional flow
- `src/pages/Dashboard.tsx` — update addEntryData state and form fields