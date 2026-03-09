

## Unified Wire Automation & Tracking App

### Phase 1: Core Setup & Data Entry

**Department Selection & TID Lookup**
- Landing page with a clean form: department dropdown (Transactions, Solutions Hub, ASC) and TID input field
- Department selection determines which Wells Fargo account PDF to attach (8022 for Transactions/Solutions Hub, 3694 for ASC)
- On TID entry, populate the form with mock deal data (Invoice #, Date, Amount, Balance Due, Customer Name, Entity, Property Address, State, Agent Name, Analyst, Notes) — ready to swap for real API later

**One-Click Wire Dispatch**
- "Send Wire Instructions" button that composes and sends an email via Lovable Cloud
- Email body auto-populated with TID, Property Address, Agent Name as remittance info, plus fee disclosure (remitter pays all bank fees)
- Correct PDF attachment selected based on department
- On send, the wire record is saved to the database and appears on the shared dashboard

### Phase 2: Shared Dashboard & Permissions

**Database Setup (Lovable Cloud)**
- `wire_records` table storing: TID, department, all deal data fields, wiring institution, wiring date, adjustments, wire receipt status, amount wired, AR date received, reconciliation notes, created_at, status
- Real-time dashboard showing all wire records with filtering and search

**Dashboard Views & Field Permissions**
- **Analyst columns** (editable by anyone for now): All deal data fields (TID, Property Address, Agent, etc.), plus post-send fields — Wiring Institution, Wiring Date, Adjustments (wire/stop pay fees)
- **Accounting columns** (visually distinguished): Wire Receipt (Y/N toggle), Amount Wired, AR Date Received, Reconciliation Notes
- Color-coded status indicators: Pending → Wired → Received → Reconciled

**UX & Layout**
- Top nav with two views: "New Wire" form and "Dashboard"
- Dashboard as a data table with inline editing, sortable columns, and status filters
- Department badge on each row showing which account (8022/3694) was used
- Clean, professional styling suitable for financial operations

### Future-Ready
- Auth and role-based permissions can be layered on later to enforce Analyst vs. Accounting edit restrictions
- TID mock data designed to easily swap for real Task Center API integration
- PDF attachments stored as static assets, replaceable with dynamic generation

