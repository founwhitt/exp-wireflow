// Wire instruction details extracted from the official PDFs

export interface WireInstructionDetails {
  accountNumber: string;
  accountLabel: string;
  bankName: string;
  bankAddress: string;
  accountName: string;
  accountHolderAddress: string;
  routingNumber: string;
  confirmationPhone: string;
  pdfPath: string;
}

export const WIRE_INSTRUCTIONS: Record<"8022" | "3694", WireInstructionDetails> = {
  "8022": {
    accountNumber: "4571488022",
    accountLabel: "Wells Fargo Account 8022",
    bankName: "Wells Fargo Bank",
    bankAddress: "420 Montgomery Street, San Francisco, CA 94104",
    accountName: "EXP REALTY, LLC",
    accountHolderAddress: "2219 Rimland Dr Ste 301, Bellingham, WA 98226-8759",
    routingNumber: "121000248",
    confirmationPhone: "855-966-1397",
    pdfPath: "/wire-instructions/8022_wire_instructions.pdf",
  },
  "3694": {
    accountNumber: "4944123694",
    accountLabel: "Wells Fargo Account 3694",
    bankName: "Wells Fargo Bank",
    bankAddress: "420 Montgomery Street, San Francisco, CA 94104",
    accountName: "EXP REALTY, LLC",
    accountHolderAddress: "2219 Rimland Dr Ste 301, Bellingham, WA 98226-8759",
    routingNumber: "121000248",
    confirmationPhone: "855-966-1397",
    pdfPath: "/wire-instructions/3694_wire_instructions.pdf",
  },
};

export function getWireInstructions(wfAccount: "8022" | "3694"): WireInstructionDetails {
  return WIRE_INSTRUCTIONS[wfAccount];
}

export function formatEmailBody(params: {
  tid: string;
  propertyAddress: string;
  agentName: string;
  balanceDue: number;
  customerName: string;
  wire: WireInstructionDetails;
}): string {
  const { tid, propertyAddress, agentName, balanceDue, customerName, wire } = params;

  return `eXp Realty, LLC — Wire Transfer Instructions

Transaction ID: ${tid}
Customer: ${customerName}
Property Address: ${propertyAddress}
Agent: ${agentName}
Amount Due: $${balanceDue.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WIRE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bank Name & Address:
${wire.bankName}
${wire.bankAddress}

Account Name: ${wire.accountName}
Address: ${wire.accountHolderAddress}

Wire ABA (Routing) Number: ${wire.routingNumber}
Account Number: ${wire.accountNumber}

For Wire Confirmations: ${wire.confirmationPhone}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT — FEE DISCLOSURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Remitter is responsible for all charges associated with the wire payment. Please contact your banking institution for any fees associated with this payment prior to sending the wire as fees may be incurred by the originating and intermediary bank.

Please use Originator. Do not use Shared or Beneficiary, as eXp Realty is not responsible for sender costs of business. eXp Realty does not charge a fee for any payment type. Do not deduct fees from invoiced amount due. Any pre-payment reduced by a bank fee deduction will be reflected on your invoice and must be paid.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REMITTANCE INFORMATION (included in wire addendum)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Transaction ID: ${tid}
Property Address: ${propertyAddress}
Agent Name: ${agentName}

Attached: ${wire.accountLabel} — Wire Instructions PDF`;
}
