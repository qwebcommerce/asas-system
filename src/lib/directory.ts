export const roles = ["superAdmin", "hr", "engineer", "accountant", "staff"] as const;
export const departments = ["projects", "people", "finance", "site"] as const;
export const requestedRoles = ["hr", "engineer", "accountant", "staff"] as const;

export type Role = (typeof roles)[number];
export type Department = (typeof departments)[number];
export type RequestedRole = (typeof requestedRoles)[number];

export type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  mobile: string;
  role: Role;
  department: Department;
  status: "active" | "disabled";
  lastActiveAt: number | null;
  twoFactor: boolean;
  signInAlerts: boolean;
  locale: "en" | "ar" | null;
  theme: "light" | "dark" | null;
};

export type ProfileSettings = {
  name: string;
  email: string;
  mobile: string;
  employeeId: string;
  twoFactor: boolean;
  signInAlerts: boolean;
  locale: "en" | "ar";
  theme: "light" | "dark";
};

export type AccessRequest = {
  id: string;
  userId: string;
  name: string;
  employeeId: string;
  requestedRole: RequestedRole;
  message: string;
  status: "pending" | "approved" | "declined";
  createdAt: number | null;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export function isRole(value: string): value is Role {
  return roles.some((role) => role === value);
}

export function isDepartment(value: string): value is Department {
  return departments.some((department) => department === value);
}

export function isRequestedRole(value: string): value is RequestedRole {
  return requestedRoles.some((role) => role === value);
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("");
}

export function millis(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return null;
}

export function mapUser(id: string, data: Record<string, unknown>): DirectoryUser {
  const role = typeof data.role === "string" && isRole(data.role) ? data.role : "staff";
  const department = typeof data.department === "string" && isDepartment(data.department) ? data.department : "site";
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    email: typeof data.email === "string" ? data.email : "",
    employeeId: typeof data.employeeId === "string" ? data.employeeId : "",
    mobile: typeof data.mobile === "string" ? data.mobile : "",
    role,
    department,
    status: data.status === "disabled" ? "disabled" : "active",
    lastActiveAt: millis(data.lastActiveAt),
    twoFactor: data.twoFactor !== false,
    signInAlerts: data.signInAlerts !== false,
    locale: data.locale === "en" || data.locale === "ar" ? data.locale : null,
    theme: data.theme === "light" || data.theme === "dark" ? data.theme : null,
  };
}

export function mapRequest(id: string, data: Record<string, unknown>): AccessRequest | null {
  if (typeof data.requestedRole !== "string" || !isRequestedRole(data.requestedRole)) return null;
  const status = data.status === "approved" || data.status === "declined" ? data.status : "pending";
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : "",
    name: typeof data.name === "string" ? data.name : "",
    employeeId: typeof data.employeeId === "string" ? data.employeeId : "",
    requestedRole: data.requestedRole,
    message: typeof data.message === "string" ? data.message : "",
    status,
    createdAt: millis(data.createdAt),
  };
}

export function requestLabelKey(role: RequestedRole) {
  if (role === "hr") return "req.hr";
  if (role === "engineer") return "req.eng";
  if (role === "accountant") return "req.acc";
  return "req.staffAsk";
}
