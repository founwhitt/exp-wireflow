export type Department = "Transactions" | "ASC" | "Payload";

export interface DepartmentConfig {
  label: string;
  wfAccount: "8022" | "3694" | null;
  accountLabel: string;
}

export const DEPARTMENTS: Record<Department, DepartmentConfig> = {
  "Transactions": {
    label: "Transactions",
    wfAccount: "8022",
    accountLabel: "Wells Fargo Account 8022",
  },
  "ASC": {
    label: "ASC",
    wfAccount: "3694",
    accountLabel: "Wells Fargo Account 3694",
  },
  "Payload": {
    label: "Payload",
    wfAccount: null,
    accountLabel: "Payload (No Wire Instructions)",
  },
};

export function getWFAccount(department: Department): "8022" | "3694" | null {
  return DEPARTMENTS[department].wfAccount;
}
