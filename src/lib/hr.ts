import { isDepartment, type Department } from "@/lib/directory";

export const attendanceStatuses = ["present", "late", "annual", "sick"] as const;
export const leaveKinds = ["annual", "sick"] as const;
export const applicantStages = ["new", "review", "offer", "hired"] as const;
export const hrDocStatuses = ["draft", "signed", "expired"] as const;

export type AttendanceStatus = (typeof attendanceStatuses)[number];
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
  status: AttendanceStatus;
  userId: string;
  idExpiry: string;
  passportExpiry: string;
  visaExpiry: string;
  bankName: string;
  ibanLast4: string;
  basic: number | null;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  userId: string;
  name: string;
  kind: LeaveKind;
  days: number;
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
};

export type AttendanceReport = {
  id: string;
  monthKey: string;
  sentAt: number | null;
  present: number;
  onLeave: number;
  late: number;
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
  const status = attendanceStatuses.find((item) => item === data.status) ?? "present";
  const department = typeof data.department === "string" && isDepartment(data.department) ? data.department : "site";
  return {
    id,
    name: text(data.name),
    employeeId: text(data.employeeId),
    positionEn: text(data.positionEn),
    positionAr: text(data.positionAr),
    department,
    mobile: text(data.mobile),
    joined: day(data.joined),
    status,
    userId: text(data.userId),
    idExpiry: day(data.idExpiry),
    passportExpiry: day(data.passportExpiry),
    visaExpiry: day(data.visaExpiry),
    bankName: text(data.bankName),
    ibanLast4: text(data.ibanLast4),
    basic: typeof data.basic === "number" ? data.basic : null,
  };
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
  return { id, titleEn: text(data.titleEn), titleAr: text(data.titleAr), status, expiresAt: day(data.expiresAt) };
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
    employees: typeof data.employees === "number" ? data.employees : 0,
  };
}

export function positionOf(employee: Employee, locale: string) {
  if (locale === "ar") return employee.positionAr || employee.positionEn;
  return employee.positionEn || employee.positionAr;
}

export function isPast(dayValue: string) {
  return Boolean(dayValue) && dayValue < qatarToday();
}
