import { roomTitle, workTitle, type Offer } from "@/lib/offers";

export const reportServices = ["construction", "finishing", "interior", "furniture", "plans"] as const;
export const workStatuses = ["complete", "progress", "waiting"] as const;

export type ReportService = (typeof reportServices)[number];
export type WorkStatus = (typeof workStatuses)[number];

export type WorkItem = {
  area: string;
  work: string;
  done: number;
  status: WorkStatus;
};

export type ProjectReport = {
  id: string;
  /** Linked project; projectEn/projectAr are copied from it. */
  projectId: string;
  projectEn: string;
  projectAr: string;
  date: string;
  weather: string;
  service: ReportService;
  workers: number;
  subcontractors: string;
  progress: number;
  issues: string;
  items: WorkItem[];
};

export type ReportInput = {
  projectId: string;
  projectEn: string;
  projectAr: string;
  date: string;
  weather: string;
  service: ReportService;
  workers: number;
  subcontractors: string;
  progress: number;
  issues: string;
  items: WorkItem[];
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function whole(value: unknown, max: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max ? value : null;
}

export function mapProjectReport(id: string, data: Record<string, unknown>): ProjectReport | null {
  const service = reportServices.find((item) => item === data.service);
  const projectEn = text(data.projectEn);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text(data.date)) ? text(data.date) : "";
  if (!service || !projectEn || !date) return null;
  const items = Array.isArray(data.items) ? data.items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const status = workStatuses.find((entry) => entry === row.status);
    const done = whole(row.done, 100);
    const area = text(row.area);
    const work = text(row.work);
    if (!status || done === null || !area || !work) return [];
    return [{ area, work, done, status }];
  }) : [];
  return {
    id,
    projectId: text(data.projectId),
    projectEn,
    projectAr: text(data.projectAr),
    date,
    weather: text(data.weather),
    service,
    workers: whole(data.workers, 999) ?? 0,
    subcontractors: text(data.subcontractors),
    progress: whole(data.progress, 100) ?? 0,
    issues: text(data.issues),
    items,
  };
}

export type ReportFile = {
  id: string;
  reportId: string;
  name: string;
  contentType: string;
  size: number;
};

export function mapReportFile(id: string, data: Record<string, unknown>): ReportFile | null {
  const reportId = text(data.reportId);
  const name = text(data.name);
  if (!reportId || !name) return null;
  return {
    id,
    reportId,
    name,
    contentType: text(data.contentType),
    size: typeof data.size === "number" ? data.size : 0,
  };
}

export function projectTitle(report: { projectEn: string; projectAr: string }, locale: string) {
  if (locale === "ar") return report.projectAr || report.projectEn;
  return report.projectEn || report.projectAr;
}

/** A project's latest report (by date), optionally ignoring the report being edited. */
export function latestReport(reports: ProjectReport[], projectId: string, exceptId = "") {
  return reports
    .filter((report) => report.projectId === projectId && report.id !== exceptId)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

/** Adds rows whose area + work is not in the list yet (case-insensitive). */
export function mergeWorkItems(current: WorkItem[], extra: WorkItem[]) {
  const key = (item: WorkItem) => `${item.area.trim().toLowerCase()}|${item.work.trim().toLowerCase()}`;
  const seen = new Set(current.map(key));
  return [...current, ...extra.filter((item) => !seen.has(key(item)) && seen.add(key(item)))];
}

/** Work items for a daily report from a project's offers: one row per area + work, not started yet. */
export function offerWorkItems(offers: Pick<Offer, "lines">[], locale: string): WorkItem[] {
  return mergeWorkItems([], offers.flatMap((offer) => offer.lines.map((line) => {
    const area = roomTitle(line, locale).trim() || (locale === "ar" ? "عام" : "General");
    const work = workTitle(line, locale).trim() || area;
    return { area: area.slice(0, 120), work: work.slice(0, 160), done: 0, status: "progress" as const };
  })));
}

function count(value: number, max: number) {
  if (!Number.isFinite(value)) return null;
  const next = Math.round(value);
  if (next < 0 || next > max) return null;
  return next;
}

/** Trims and checks a report (shared by the form's save and the AI assistant's draft). Null when invalid. */
export function cleanReportInput(input: ReportInput): ReportInput | null {
  const projectEn = input.projectEn.trim();
  const projectAr = input.projectAr.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : "";
  const workers = count(input.workers, 999);
  const progress = count(input.progress, 100);
  if (!projectEn || !projectAr || !date || !reportServices.includes(input.service) || workers === null || progress === null) return null;
  if (!Array.isArray(input.items) || input.items.length > 40) return null;
  const items: WorkItem[] = [];
  for (const item of input.items) {
    const area = item.area.trim();
    const work = item.work.trim();
    if (!area && !work) continue;
    const done = count(item.done, 100);
    if (!area || !work || !workStatuses.includes(item.status) || done === null) return null;
    items.push({ area, work, done, status: item.status });
  }
  return {
    projectId: input.projectId,
    projectEn,
    projectAr,
    date,
    weather: input.weather.trim().slice(0, 80),
    service: input.service,
    workers,
    subcontractors: input.subcontractors.trim().slice(0, 200),
    progress,
    issues: input.issues.trim().slice(0, 4000),
    items,
  };
}
