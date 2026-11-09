"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { reportServices, workStatuses, type ReportInput, type WorkItem } from "@/lib/reports";
import type { ActionResult } from "@/lib/directory";
import { canReadAll, canWriteModule, seesOwn } from "@/lib/access";
import { actor, audit, type Gate } from "@/server/session";
import { removePrivateFile, signedReadUrl } from "@/server/blobs";

function count(value: number, max: number) {
  if (!Number.isFinite(value)) return null;
  const next = Math.round(value);
  if (next < 0 || next > max) return null;
  return next;
}

function clean(input: ReportInput): ReportInput | null {
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

async function manager(idToken: string, reportId?: string) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  const owner = reportId ? await reportOwner(reportId) : who.uid;
  if (!canChangeReport(who, owner)) return { error: "rep.forbidden" as const };
  return who;
}

function canChangeReport(who: Gate, owner: string | null) {
  const level = who.level("reports");
  if (canWriteModule(level)) return true;
  return seesOwn(level) && owner === who.uid;
}

async function reportOwner(reportId: string) {
  const snap = await adminDb().collection("projectReports").doc(reportId).get();
  return typeof snap.data()?.createdBy === "string" ? snap.data()?.createdBy : "";
}

export async function createProjectReport(idToken: string, input: ReportInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const report = clean(input);
    if (!report) return { ok: false, error: "us.invalid" };
    const ref = await adminDb().collection("projectReports").add({
      ...report,
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("reports.create", who.uid, ref.id, report.projectEn);
    return { ok: true, id: ref.id };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateProjectReport(idToken: string, reportId: string, input: ReportInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken, reportId);
    if ("error" in who) return { ok: false, error: who.error };
    const report = clean(input);
    if (!report) return { ok: false, error: "us.invalid" };
    const ref = adminDb().collection("projectReports").doc(reportId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    await ref.update({ ...report, updatedAt: FieldValue.serverTimestamp() });
    await audit("reports.update", who.uid, reportId, report.projectEn);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteProjectReport(idToken: string, reportId: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken, reportId);
    if ("error" in who) return { ok: false, error: who.error };
    const ref = adminDb().collection("projectReports").doc(reportId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const files = await adminDb().collection("reportFiles").where("reportId", "==", reportId).get();
    const batch = adminDb().batch();
    files.docs.forEach((item) => batch.delete(item.ref));
    batch.delete(ref);
    await batch.commit();
    await Promise.all(files.docs.map((item) => {
      const path = item.data().storagePath;
      return typeof path === "string" ? removePrivateFile(path) : Promise.resolve();
    }));
    await audit("reports.delete", who.uid, reportId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteReportFile(idToken: string, fileId: string): Promise<ActionResult> {
  try {
    const ref = adminDb().collection("reportFiles").doc(fileId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const reportId = typeof snap.data()?.reportId === "string" ? snap.data()?.reportId : "";
    const who = await manager(idToken, reportId);
    if ("error" in who) return { ok: false, error: who.error };
    const path = snap.data()?.storagePath;
    await ref.delete();
    if (typeof path === "string") await removePrivateFile(path);
    await audit("reports.file.delete", who.uid, fileId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function openReportFile(idToken: string, fileId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const snap = await adminDb().collection("reportFiles").doc(fileId).get();
    const reportId = typeof snap.data()?.reportId === "string" ? snap.data()?.reportId : "";
    const level = who.level("reports");
    const owner = await reportOwner(reportId);
    if (!canReadAll(level) && !(seesOwn(level) && owner === who.uid)) return { ok: false, error: "rep.forbidden" };
    const path = snap.data()?.storagePath;
    if (!snap.exists || typeof path !== "string" || !path.startsWith("project-reports/")) return { ok: false, error: "us.invalid" };
    return { ok: true, url: await signedReadUrl(path) };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}
