export type Department = "Transactions" | "Solutions Hub" | "ASC" | "Other";

export interface DepartmentConfig {
  label: string;
  wfAccount: "8022" | "3694" | "custom";
  accountLabel: string;
}

export const DEPARTMENTS: Record<Department, DepartmentConfig> = {
  "Transactions": {
    label: "Transactions",
    wfAccount: "8022",
    accountLabel: "Wells Fargo Account 8022",
  },
  "Solutions Hub": {
    label: "Solutions Hub",
    wfAccount: "8022",
    accountLabel: "Wells Fargo Account 8022",
  },
  "ASC": {
    label: "ASC",
    wfAccount: "3694",
    accountLabel: "Wells Fargo Account 3694",
  },
  "Other": {
    label: "Other (Custom)",
    wfAccount: "custom",
    accountLabel: "Custom Wire Instructions",
  },
};

export function getWFAccount(department: Department): "8022" | "3694" | "custom" {
  return DEPARTMENTS[department].wfAccount;
}
