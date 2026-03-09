export type Department = "Transactions" | "Solutions Hub" | "ASC";

export interface DepartmentConfig {
  label: string;
  wfAccount: "8022" | "3694";
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
};

export function getWFAccount(department: Department): "8022" | "3694" {
  return DEPARTMENTS[department].wfAccount;
}
