"use server";

import { FieldValue } from "firebase-admin/firestore";
import type { ActionResult } from "@/lib/directory";
import { adminDb } from "@/lib/firebase-admin";
import { qatarToday } from "@/lib/hr";
import { actor, audit } from "@/server/session";
import { buildWeeklyReports } from "@/server/weekly-core";

/** Weekly reports are approved by a Super Admin. */
async function approver(idToken: string) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  if (who.role !== "superAdmin") return { error: "wk.forbidden" as const };
  return who;
}

/** Builds (or rebuilds) this week's reports now, instead of waiting for Thursday evening. */
export async function generateWeeklyNow(idToken: string): Promise<ActionResult & { created?: number; updated?: number }> {
  try {
    const who = await approver(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const outcome = await buildWeeklyReports(who.uid);
    await audit("weekly.generate", who.uid, outcome.weekStart, `${outcome.created} new, ${outcome.updated} rebuilt`);
    return { ok: true, created: outcome.created, updated: outcome.updated };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

/** Approve a weekly report, or return it with a note (it can then be rebuilt after the daily reports are fixed). */
export async function reviewWeekly(idToken: string, weeklyId: string, decision: "approved" | "returned", note: string): Promise<ActionResult> {
  try {
    const who = await approver(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (decision !== "approved" && decision !== "returned") return { ok: false, error: "us.invalid" };
    const reviewNote = note.trim().slice(0, 1000);
    if (decision === "returned" && !reviewNote) return { ok: false, error: "wk.needNote" };
    const ref = adminDb().collection("weeklyReports").doc(weeklyId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    await ref.update({ status: decision, reviewNote, reviewedBy: who.uid, reviewedAt: qatarToday(), reviewedTime: FieldValue.serverTimestamp() });
    await audit(`weekly.${decision}`, who.uid, weeklyId, reviewNote);
    return { ok: true, id: weeklyId };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}
