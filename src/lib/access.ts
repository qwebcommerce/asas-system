export const matrixRoles = ["superAdmin", "ceo", "hr", "engineer", "accountant", "staff"] as const;
export const matrixModules = ["users", "hr", "reports", "offers", "documents", "accounting", "payroll", "email"] as const;
export const permissionLevels = ["full", "view", "none", "own", "request", "approve"] as const;

export type MatrixRole = (typeof matrixRoles)[number];
export type MatrixModule = (typeof matrixModules)[number];
export type PermissionLevel = (typeof permissionLevels)[number];
export type RoleMatrix = Record<MatrixRole, Record<MatrixModule, PermissionLevel>>;

const fullRow = Object.fromEntries(matrixModules.map((module) => [module, "full"])) as Record<MatrixModule, PermissionLevel>;

export const defaultMatrix: RoleMatrix = {
  superAdmin: { ...fullRow },
  ceo: { ...fullRow },
  hr: { users: "none", hr: "full", reports: "none", offers: "none", documents: "own", accounting: "none", payroll: "request", email: "own" },
  engineer: { users: "none", hr: "own", reports: "full", offers: "full", documents: "own", accounting: "none", payroll: "none", email: "own" },
  accountant: { users: "none", hr: "view", reports: "view", offers: "view", documents: "own", accounting: "full", payroll: "full", email: "own" },
  staff: { users: "none", hr: "own", reports: "none", offers: "none", documents: "own", accounting: "none", payroll: "own", email: "own" },
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

export function isLockedRole(role: MatrixRole) {
  return role === "superAdmin" || role === "ceo";
}

export function mapMatrix(data: Record<string, unknown> | undefined): RoleMatrix {
  const next = structuredClone(defaultMatrix);
  if (!data) return next;
  for (const role of matrixRoles) {
    if (isLockedRole(role)) continue;
    const row = data[role];
    if (!row || typeof row !== "object") continue;
    for (const module of matrixModules) {
      const level = (row as Record<string, unknown>)[module];
      if (typeof level === "string" && isPermissionLevel(level)) next[role][module] = level;
    }
  }
  return next;
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
  return `nav.${module}`;
}
