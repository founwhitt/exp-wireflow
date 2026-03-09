// Mock TID data — replace with real Task Center API later
export interface TIDData {
  invoiceNumber: string;
  invoiceDate: string;
  originalAmount: number;
  balanceDue: number;
  customerName: string;
  entity: string;
  customerIdPrefix: string;
  customerIdSuffix: string;
  propertyAddress: string;
  transactionState: string;
  agentName: string;
  assignedAnalyst: string;
  dealNotes: string;
}

const mockDatabase: Record<string, TIDData> = {
  "TID-10001": {
    invoiceNumber: "INV-2026-4481",
    invoiceDate: "2026-02-15",
    originalAmount: 125000.00,
    balanceDue: 118750.00,
    customerName: "Meridian Holdings LLC",
    entity: "Meridian Capital Group",
    customerIdPrefix: "MER",
    customerIdSuffix: "4481",
    propertyAddress: "742 Evergreen Terrace, Springfield, IL 62704",
    transactionState: "Illinois",
    agentName: "Sarah Mitchell",
    assignedAnalyst: "James Rivera",
    dealNotes: "Client prefers wire over ACH. Title company confirmed closing date 03/15/2026.",
  },
  "TID-10002": {
    invoiceNumber: "INV-2026-5590",
    invoiceDate: "2026-03-01",
    originalAmount: 89500.00,
    balanceDue: 89500.00,
    customerName: "Oakridge Ventures Inc.",
    entity: "Oakridge Development Corp",
    customerIdPrefix: "OAK",
    customerIdSuffix: "5590",
    propertyAddress: "1600 Pennsylvania Ave NW, Washington, DC 20500",
    transactionState: "District of Columbia",
    agentName: "David Chen",
    assignedAnalyst: "Maria Gonzalez",
    dealNotes: "Rush wire requested. Agent confirmed all docs received.",
  },
  "TID-10003": {
    invoiceNumber: "INV-2026-6723",
    invoiceDate: "2026-03-05",
    originalAmount: 245000.00,
    balanceDue: 232750.00,
    customerName: "Pinnacle Real Estate Trust",
    entity: "Pinnacle RE Holdings",
    customerIdPrefix: "PIN",
    customerIdSuffix: "6723",
    propertyAddress: "350 Fifth Avenue, Suite 3400, New York, NY 10118",
    transactionState: "New York",
    agentName: "Amanda Foster",
    assignedAnalyst: "Robert Kim",
    dealNotes: "Multiple parties involved. Confirm split disbursement with title co.",
  },
};

export function lookupTID(tid: string): TIDData | null {
  const normalized = tid.toUpperCase().trim();
  return mockDatabase[normalized] ?? null;
}

export function getAvailableTIDs(): string[] {
  return Object.keys(mockDatabase);
}
