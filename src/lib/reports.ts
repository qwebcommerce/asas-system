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
