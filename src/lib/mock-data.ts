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
  if (!normalized) return null;

  // Return hardcoded data if available
  if (mockDatabase[normalized]) return mockDatabase[normalized];

  // Generate plausible mock data for any TID
  return generateMockData(normalized);
}

function generateMockData(tid: string): TIDData {
  // Use a simple hash of the TID to seed deterministic but varied data
  const hash = Array.from(tid).reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const customers = [
    { name: "Summit Capital Partners", entity: "Summit Holdings Group", prefix: "SUM" },
    { name: "Coastal Realty Trust", entity: "Coastal Development Inc", prefix: "CST" },
    { name: "Vanguard Properties LLC", entity: "Vanguard Real Estate Corp", prefix: "VAN" },
    { name: "Horizon Land Holdings", entity: "Horizon Capital Group", prefix: "HOR" },
    { name: "Atlas Commercial Partners", entity: "Atlas RE Ventures", prefix: "ATL" },
    { name: "Keystone Equity Group", entity: "Keystone Investments LLC", prefix: "KEY" },
  ];

  const addresses = [
    "1200 Market Street, Suite 400, Philadelphia, PA 19107",
    "500 Boylston Street, Boston, MA 02116",
    "3000 Sand Hill Road, Menlo Park, CA 94025",
    "200 S Wacker Drive, Chicago, IL 60606",
    "1100 Peachtree Street NE, Atlanta, GA 30309",
    "700 Louisiana Street, Houston, TX 77002",
  ];

  const states = ["Pennsylvania", "Massachusetts", "California", "Illinois", "Georgia", "Texas"];

  const agents = [
    "Michael Thompson", "Jessica Park", "Ryan O'Brien", "Laura Chen",
    "Daniel Kim", "Samantha Wells", "Andrew Martinez", "Nicole Harris",
  ];

  const analysts = [
    "James Rivera", "Maria Gonzalez", "Robert Kim", "Sarah Mitchell",
    "Patricia Wong", "Christopher Lee",
  ];

  const i = hash % customers.length;
  const customer = customers[i];
  const amount = 50000 + (hash * 1337) % 450000;
  const balanceDue = amount - (hash * 47) % 15000;
  const suffix = tid.replace(/\D/g, "").slice(-4) || String(1000 + (hash % 9000));
  const year = 2026;
  const month = 1 + (hash % 12);
  const day = 1 + (hash % 28);

  return {
    invoiceNumber: `INV-${year}-${suffix}`,
    invoiceDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    originalAmount: Math.round(amount * 100) / 100,
    balanceDue: Math.round(balanceDue * 100) / 100,
    customerName: customer.name,
    entity: customer.entity,
    customerIdPrefix: customer.prefix,
    customerIdSuffix: suffix,
    propertyAddress: addresses[i],
    transactionState: states[i],
    agentName: agents[hash % agents.length],
    assignedAnalyst: analysts[hash % analysts.length],
    dealNotes: `Auto-generated mock data for ${tid}. Replace with Task Center API integration.`,
  };
}

export function getAvailableTIDs(): string[] {
  return Object.keys(mockDatabase);
}
