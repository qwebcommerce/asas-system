import { isDepartment, type Department } from "@/lib/directory";

export const attendanceStatuses = ["present", "late", "absent", "annual", "sick"] as const;
export const employmentStates = ["active", "inactive"] as const;
export const leaveKinds = ["annual", "sick"] as const;
export const applicantStages = ["new", "review", "offer", "hired"] as const;
export const hrDocStatuses = ["draft", "signed", "expired"] as const;

export type AttendanceStatus = (typeof attendanceStatuses)[number];
export type Employment = (typeof employmentStates)[number];
export type LeaveKind = (typeof leaveKinds)[number];
export type ApplicantStage = (typeof applicantStages)[number];
export type HrDocStatus = (typeof hrDocStatuses)[number];

export type Employee = {
  id: string;
  name: string;
  employeeId: string;
  positionEn: string;
  positionAr: string;
  department: Department;
  mobile: string;
  joined: string;
  employment: Employment;
  userId: string;
  idExpiry: string;
  passportExpiry: string;
  visaExpiry: string;
  basic: number | null;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  userId: string;
  name: string;
  kind: LeaveKind;
  days: number;
  startsOn: string;
  endsOn: string;
  note: string;
  status: "pending" | "approved" | "declined";
};

export type JobPost = {
  id: string;
  titleEn: string;
  titleAr: string;
  department: Department;
};

export type Applicant = {
  id: string;
  jobId: string;
  name: string;
  score: number | null;
  note: string;
  stage: ApplicantStage;
};

export type HrDocument = {
  id: string;
  titleEn: string;
  titleAr: string;
  status: HrDocStatus;
  expiresAt: string;
  hasFile: boolean;
};

export type EmployeeFile = {
  id: string;
  employeeId: string;
  userId: string;
  titleEn: string;
  titleAr: string;
  contentType: string;
  size: number;
};

export type AttendanceReport = {
  id: string;
  monthKey: string;
  sentAt: number | null;
  present: number;
  onLeave: number;
  late: number;
  absent: number;
  employees: number;
};

export function qatarToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Qatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function currentMonthKey() {
  return qatarToday().slice(0, 7);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function day(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export function mapEmployee(id: string, data: Record<string, unknown>): Employee {
  const department = typeof data.department === "string" && isDepartment(data.department) ? data.department : "site";
  const employment = data.employment === "inactive" ? "inactive" : "active";
  return {
    id,
    name: text(data.name),
    employeeId: text(data.employeeId),
    positionEn: text(data.positionEn),
    positionAr: text(data.positionAr),
    department,
    mobile: text(data.mobile),
    joined: day(data.joined),
    employment,
    userId: text(data.userId),
    idExpiry: day(data.idExpiry),
    passportExpiry: day(data.passportExpiry),
    visaExpiry: day(data.visaExpiry),
    basic: typeof data.basic === "number" ? data.basic : null,
  };
}

export function mapAttendance(data: Record<string, unknown>): { employeeId: string; status: AttendanceStatus } | null {
  const employeeId = text(data.employeeId);
  const status = attendanceStatuses.find((item) => item === data.status);
  if (!employeeId || !status) return null;
  return { employeeId, status };
}

export function mapLeave(id: string, data: Record<string, unknown>): LeaveRequest | null {
  const kind = leaveKinds.find((item) => item === data.kind);
  if (!kind) return null;
  const status = data.status === "approved" || data.status === "declined" ? data.status : "pending";
  return {
    id,
    employeeId: text(data.employeeId),
    userId: text(data.userId),
    name: text(data.name),
    kind,
    days: typeof data.days === "number" ? data.days : 0,
    startsOn: day(data.startsOn),
    endsOn: day(data.endsOn),
    note: text(data.note),
    status,
  };
}

export function mapJob(id: string, data: Record<string, unknown>): JobPost | null {
  const department = typeof data.department === "string" && isDepartment(data.department) ? data.department : null;
  if (!department || !text(data.titleEn)) return null;
  return { id, titleEn: text(data.titleEn), titleAr: text(data.titleAr), department };
}

export function mapApplicant(id: string, data: Record<string, unknown>): Applicant | null {
  const stage = applicantStages.find((item) => item === data.stage) ?? "new";
  if (!text(data.name) || !text(data.jobId)) return null;
  return {
    id,
    jobId: text(data.jobId),
    name: text(data.name),
    score: typeof data.score === "number" ? data.score : null,
    note: text(data.note),
    stage,
  };
}

export function mapHrDocument(id: string, data: Record<string, unknown>): HrDocument | null {
  const status = hrDocStatuses.find((item) => item === data.status) ?? "draft";
  if (!text(data.titleEn)) return null;
  return { id, titleEn: text(data.titleEn), titleAr: text(data.titleAr), status, expiresAt: day(data.expiresAt), hasFile: text(data.storagePath).length > 0 };
}

export function mapEmployeeFile(id: string, data: Record<string, unknown>): EmployeeFile | null {
  const titleEn = text(data.titleEn);
  const employeeId = text(data.employeeId);
  if (!titleEn || !employeeId) return null;
  return {
    id,
    employeeId,
    userId: text(data.userId),
    titleEn,
    titleAr: text(data.titleAr),
    contentType: text(data.contentType),
    size: typeof data.size === "number" ? data.size : 0,
  };
}

export function mapReport(id: string, data: Record<string, unknown>): AttendanceReport {
  const sent = data.sentAt;
  const sentAt = sent && typeof sent === "object" && "toMillis" in sent && typeof sent.toMillis === "function" ? sent.toMillis() : null;
  return {
    id,
    monthKey: text(data.monthKey) || id,
    sentAt,
    present: typeof data.present === "number" ? data.present : 0,
    onLeave: typeof data.onLeave === "number" ? data.onLeave : 0,
    late: typeof data.late === "number" ? data.late : 0,
    absent: typeof data.absent === "number" ? data.absent : 0,
    employees: typeof data.employees === "number" ? data.employees : 0,
  };
}

export function positionOf(employee: Employee, locale: string) {
  if (locale === "ar") return employee.positionAr || employee.positionEn;
  return employee.positionEn || employee.positionAr;
}

export function inclusiveDays(start: string, end: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) return 0;
  const from = Date.parse(`${start}T12:00:00+03:00`);
  const to = Date.parse(`${end}T12:00:00+03:00`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.round((to - from) / 86_400_000) + 1;
}

export function isPast(dayValue: string) {
  return Boolean(dayValue) && dayValue < qatarToday();
}
