import type { ProjectReport } from "@/lib/reports";

/*
 * Weekly project reports. Built from a project's daily reports for one week (Sunday to Saturday,
 * Qatar's working week starts on Sunday), generated on Thursday evening before the weekend,
 * and approved (or returned) by a Super Admin.
 */

export const weeklyStatuses = ["pending", "approved", "returned"] as const;
export type WeeklyStatus = (typeof weeklyStatuses)[number];

export type WeeklyStats = {
  reports: number;
  /** Sum of workers over the reported days */
  workerDays: number;
  avgWorkers: number;
  progressStart: number;
  progressEnd: number;
  itemsComplete: number;
  itemsWaiting: number;
};

export type WeeklyReport = {
  id: string;
  projectId: string;
  projectEn: string;
  projectAr: string;
  projectCode: string;
  weekStart: string;
  weekEnd: string;
  status: WeeklyStatus;
  reportIds: string[];
  stats: WeeklyStats;
  summaryEn: string;
  summaryAr: string;
  highlightsEn: string[];
  highlightsAr: string[];
  risksEn: string;
  risksAr: string;
  /** "ai" when Claude wrote the summary, "template" when it was put together without AI */
  source: "ai" | "template";
  reviewNote: string;
  reviewedBy: string;
  reviewedAt: string;
};

/** Adds days to a YYYY-MM-DD date. */
export function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Sunday that starts the week containing `day` (YYYY-MM-DD). */
export function weekStartOf(day: string) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -weekday);
}

export function weeklyId(projectId: string, weekStart: string) {
  return `${projectId}_${weekStart}`;
}

export function weeklyStats(reports: ProjectReport[]): WeeklyStats {
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));
  const workerDays = sorted.reduce((sum, report) => sum + report.workers, 0);
  const lastItems = sorted.at(-1)?.items ?? [];
  return {
    reports: sorted.length,
    workerDays,
    avgWorkers: sorted.length ? Math.round(workerDays / sorted.length) : 0,
    progressStart: sorted[0]?.progress ?? 0,
    progressEnd: sorted.at(-1)?.progress ?? 0,
    itemsComplete: lastItems.filter((item) => item.status === "complete").length,
    itemsWaiting: lastItems.filter((item) => item.status === "waiting").length,
  };
}

/** Written summary used when AI is not configured (or fails): facts only, both languages. */
export function templateSummary(stats: WeeklyStats, reports: ProjectReport[]) {
  const issues = reports.map((report) => report.issues.trim()).filter(Boolean);
  const change = stats.progressEnd - stats.progressStart;
  return {
    summaryEn: `${stats.reports} daily ${stats.reports === 1 ? "report" : "reports"} this week. Overall progress went from ${stats.progressStart}% to ${stats.progressEnd}% (${change >= 0 ? "+" : ""}${change} points), with ${stats.avgWorkers} workers on site on average.`,
    summaryAr: `${stats.reports} ${stats.reports === 1 ? "تقرير يومي" : "تقارير يومية"} هذا الأسبوع. ارتفع التقدم الإجمالي من ${stats.progressStart}% إلى ${stats.progressEnd}% (${change >= 0 ? "+" : ""}${change} نقطة)، بمتوسط ${stats.avgWorkers} عاملاً في الموقع.`,
    highlightsEn: [`${stats.itemsComplete} work items complete`, `${stats.itemsWaiting} work items waiting`],
    highlightsAr: [`${stats.itemsComplete} بنود عمل مكتملة`, `${stats.itemsWaiting} بنود عمل بانتظار`],
    risksEn: issues.join("\n"),
    risksAr: issues.join("\n"),
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function count(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function lines(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function mapWeekly(id: string, data: Record<string, unknown>): WeeklyReport | null {
  const status = weeklyStatuses.find((item) => item === data.status);
  const weekStart = text(data.weekStart);
  if (!status || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || !text(data.projectId)) return null;
  const stats = (data.stats ?? {}) as Record<string, unknown>;
  return {
    id,
    projectId: text(data.projectId),
    projectEn: text(data.projectEn),
    projectAr: text(data.projectAr),
    projectCode: text(data.projectCode),
    weekStart,
    weekEnd: text(data.weekEnd),
    status,
    reportIds: lines(data.reportIds),
    stats: {
      reports: count(stats.reports),
      workerDays: count(stats.workerDays),
      avgWorkers: count(stats.avgWorkers),
      progressStart: count(stats.progressStart),
      progressEnd: count(stats.progressEnd),
      itemsComplete: count(stats.itemsComplete),
      itemsWaiting: count(stats.itemsWaiting),
    },
    summaryEn: text(data.summaryEn),
    summaryAr: text(data.summaryAr),
    highlightsEn: lines(data.highlightsEn),
    highlightsAr: lines(data.highlightsAr),
    risksEn: text(data.risksEn),
    risksAr: text(data.risksAr),
    source: data.source === "ai" ? "ai" : "template",
    reviewNote: text(data.reviewNote),
    reviewedBy: text(data.reviewedBy),
    reviewedAt: text(data.reviewedAt),
  };
}
