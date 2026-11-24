import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { qatarToday } from "@/lib/hr";
import { mapProject, type Project } from "@/lib/projects";
import { mapProjectReport, type ProjectReport } from "@/lib/reports";
import { addDays, templateSummary, weekStartOf, weeklyId, weeklyStats, type WeeklyStats } from "@/lib/weekly";

/*
 * Builds the weekly report of every project that has daily reports in a week.
 * Used by the Thursday-evening schedule (/api/cron/weekly-reports) and the "Generate now" button.
 * Reports already approved are left as they are; pending or returned ones are rebuilt.
 */

const Summary = z.object({
  summaryEn: z.string().describe("2-4 sentence summary of the week for management, in English"),
  summaryAr: z.string().describe("The same summary in Arabic"),
  highlightsEn: z.array(z.string()).describe("Up to 5 short bullet points: work completed or moved forward, in English"),
  highlightsAr: z.array(z.string()).describe("The same bullet points in Arabic"),
  risksEn: z.string().describe("Issues, delays or decisions needed, in English; empty string if none were reported"),
  risksAr: z.string().describe("The same in Arabic; empty string if none"),
});

async function aiSummary(project: Project, weekStart: string, weekEnd: string, stats: WeeklyStats, reports: ProjectReport[]) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_BASE_URL) return null;
  const client = new Anthropic();
  const daily = [...reports]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((report) => ({
      date: report.date,
      service: report.service,
      workers: report.workers,
      progress: report.progress,
      weather: report.weather,
      subcontractors: report.subcontractors,
      items: report.items,
      issues: report.issues,
    }));
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium", format: betaZodOutputFormat(Summary) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system:
      "You write the weekly progress report of a construction / fit-out project for the management of ASAS Executive Contracting in Qatar. " +
      "Use only the facts in the daily reports given; do not invent work, numbers or dates. Plain, factual tone. " +
      "Write each field in English and in Arabic as named. Mention the progress change and anything waiting or delayed.",
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          project: { code: project.code, name_en: project.nameEn, name_ar: project.nameAr, type: project.kind },
          week: { from: weekStart, to: weekEnd },
          totals: stats,
          daily_reports: daily,
        }),
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  const out = response.parsed_output;
  return {
    summaryEn: out.summaryEn.trim(),
    summaryAr: out.summaryAr.trim(),
    highlightsEn: out.highlightsEn.slice(0, 5),
    highlightsAr: out.highlightsAr.slice(0, 5),
    risksEn: out.risksEn.trim(),
    risksAr: out.risksAr.trim(),
  };
}

/** The week to report on: this week (Sunday start, Qatar time) unless another start is given. */
export function currentWeek(start?: string) {
  const weekStart = start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? weekStartOf(start) : weekStartOf(qatarToday());
  return { weekStart, weekEnd: addDays(weekStart, 6) };
}

export async function buildWeeklyReports(generatedBy: string, start?: string) {
  const { weekStart, weekEnd } = currentWeek(start);
  const reportsSnap = await adminDb().collection("projectReports").where("date", ">=", weekStart).where("date", "<=", weekEnd).get();
  const byProject = new Map<string, ProjectReport[]>();
  for (const doc of reportsSnap.docs) {
    const report = mapProjectReport(doc.id, doc.data());
    if (!report?.projectId) continue;
    byProject.set(report.projectId, [...(byProject.get(report.projectId) ?? []), report]);
  }

  const outcome = { weekStart, weekEnd, created: 0, updated: 0, skippedApproved: 0, ai: 0 };
  for (const [projectId, reports] of byProject) {
    const projectSnap = await adminDb().collection("projects").doc(projectId).get();
    const project = projectSnap.exists ? mapProject(projectSnap.id, projectSnap.data() ?? {}) : null;
    if (!project) continue;
    const ref = adminDb().collection("weeklyReports").doc(weeklyId(projectId, weekStart));
    const existing = await ref.get();
    if (existing.exists && existing.data()?.status === "approved") {
      outcome.skippedApproved++;
      continue;
    }
    const stats = weeklyStats(reports);
    let summary = null;
    try {
      summary = await aiSummary(project, weekStart, weekEnd, stats, reports);
    } catch (error) {
      console.error("weekly summary: AI unavailable, using the template", error);
    }
    if (summary) outcome.ai++;
    await ref.set({
      projectId,
      projectEn: project.nameEn,
      projectAr: project.nameAr,
      projectCode: project.code,
      weekStart,
      weekEnd,
      status: "pending",
      reportIds: reports.map((report) => report.id),
      stats,
      ...(summary ?? templateSummary(stats, reports)),
      source: summary ? "ai" : "template",
      reviewNote: "",
      reviewedBy: "",
      reviewedAt: "",
      generatedBy,
      generatedAt: FieldValue.serverTimestamp(),
    });
    if (existing.exists) outcome.updated++;
    else outcome.created++;
  }
  return outcome;
}
