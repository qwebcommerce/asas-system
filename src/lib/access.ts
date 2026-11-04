export const matrixRoles = ["superAdmin", "ceo", "hr", "engineer", "accountant", "staff"] as const;
export const matrixModules = ["users", "hr", "reports", "offers", "documents", "accounting", "payroll", "email", "bank"] as const;
export const permissionLevels = ["full", "view", "none", "own", "request", "approve"] as const;

export type MatrixRole = (typeof matrixRoles)[number];
export type MatrixModule = (typeof matrixModules)[number];
export type PermissionLevel = (typeof permissionLevels)[number];
export type RoleMatrix = Record<MatrixRole, Record<MatrixModule, PermissionLevel>>;

export type BankAccount = {
  id: string;
  name: string;
  bank: string;
  last4: string;
  balance: number;
};

const fullRow = Object.fromEntries(matrixModules.map((module) => [module, "full"])) as Record<MatrixModule, PermissionLevel>;

export const defaultMatrix: RoleMatrix = {
  superAdmin: { ...fullRow },
  ceo: { users: "view", hr: "view", reports: "view", offers: "view", documents: "full", accounting: "view", payroll: "approve", email: "own", bank: "view" },
  hr: { users: "none", hr: "full", reports: "none", offers: "none", documents: "own", accounting: "none", payroll: "request", email: "own", bank: "none" },
  engineer: { users: "none", hr: "own", reports: "full", offers: "full", documents: "own", accounting: "none", payroll: "none", email: "own", bank: "none" },
  accountant: { users: "none", hr: "view", reports: "view", offers: "view", documents: "own", accounting: "full", payroll: "full", email: "own", bank: "view" },
  staff: { users: "none", hr: "own", reports: "none", offers: "none", documents: "own", accounting: "none", payroll: "own", email: "own", bank: "none" },
};

export function isMatrixRole(value: string): value is MatrixRole {
  return matrixRoles.some((role) => role === value);
}

export function isMatrixModule(value: string): value is MatrixModule {
  return matrixModules.some((module) => module === value);
}

export function isPermissionLevel(value: string): value is PermissionLevel {
  return permissionLevels.some((level) => level === value);
}

export function mapMatrix(data: Record<string, unknown> | undefined): RoleMatrix {
  const next = structuredClone(defaultMatrix);
  if (!data) return next;
  for (const role of matrixRoles) {
    if (role === "superAdmin") {
      const row = data[role];
      if (row && typeof row === "object") {
        for (const module of matrixModules) {
          if (module === "users") continue;
          const level = (row as Record<string, unknown>)[module];
          if (typeof level === "string" && isPermissionLevel(level)) next[role][module] = level;
        }
      }
      continue;
    }
    const row = data[role];
    if (!row || typeof row !== "object") continue;
    for (const module of matrixModules) {
      const level = (row as Record<string, unknown>)[module];
      if (typeof level === "string" && isPermissionLevel(level)) next[role][module] = level;
    }
  }
  return next;
}

export function mapBank(id: string, data: Record<string, unknown>): BankAccount | null {
  const name = typeof data.name === "string" ? data.name : "";
  const last4 = typeof data.last4 === "string" ? data.last4 : "";
  if (!name || !/^\d{4}$/.test(last4)) return null;
  return {
    id,
    name,
    bank: typeof data.bank === "string" ? data.bank : "",
    last4,
    balance: typeof data.balance === "number" ? data.balance : 0,
  };
}

export function levelKey(level: PermissionLevel) {
  if (level === "full") return "sample.lvlFull";
  if (level === "view") return "sample.lvlView";
  if (level === "own") return "sample.lvlOwn";
  if (level === "request") return "sample.lvlRequest";
  if (level === "approve") return "sample.lvlApprove";
  return "sample.lvlNone";
}

export function moduleKey(module: MatrixModule) {
  if (module === "bank") return "ut.bank";
  return `nav.${module}`;
}
