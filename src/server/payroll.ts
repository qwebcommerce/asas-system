"use server";

import { FieldValue } from "firebase-admin/firestore";
import type { ActionResult } from "@/lib/directory";
import { currentMonthKey } from "@/lib/hr";
import { mapPayrollRun, payMethods, type PayrollLine } from "@/lib/payroll";
import { adminDb } from "@/lib/firebase-admin";
import { canWriteModule } from "@/lib/access";
import { payrollLines, syncDraftPayrollRuns } from "@/server/payroll-lines";
import { actor, audit } from "@/server/session";

function money(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 1_000_000 ? value : null;
}

function cleanLines(stored: PayrollLine[], input: PayrollLine[]): PayrollLine[] | null {
  if (!Array.isArray(input) || input.length !== stored.length || input.length > 500) return null;
  const next: PayrollLine[] = [];
  for (const line of stored) {
    const edited = input.find((item) => item.employeeId === line.employeeId);
    if (!edited) return null;
    const allowance = money(edited.allowance);
    const deduction = money(edited.deduction);
    const method = payMethods.find((item) => item === edited.method);
    if (allowance === null || deduction === null || !method || deduction > line.basic + allowance) return null;
    next.push({ ...line, allowance, deduction, method });
  }
  return next;
}

async function manager(idToken: string) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  if (!canWriteModule(who.level("payroll"))) return { error: "pay.forbidden" as const };
  return who;
}

async function runOf(id: string) {
  if (!/^\d{4}-\d{2}$/.test(id)) return null;
  const snap = await adminDb().collection("payrollRuns").doc(id).get();
  if (!snap.exists) return null;
  return snap;
}

export async function createPayrollRun(idToken: string, month: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!/^\d{4}-\d{2}$/.test(month) || month > currentMonthKey()) return { ok: false, error: "pay.future" };
    const ref = adminDb().collection("payrollRuns").doc(month);
    if ((await ref.get()).exists) return { ok: false, error: "pay.exists" };
    const report = await adminDb().collection("attendanceReports").doc(month).get();
    const lines = await payrollLines(month);
    if (lines.length === 0) return { ok: false, error: "pay.noEmployees" };
    await ref.set({
      month,
      status: "draft",
      lines,
      attendanceSent: report.exists,
      createdBy: who.uid,
      approvedBy: "",
      paidBy: "",
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("payroll.create", who.uid, month, String(lines.length));
    return { ok: true, id: month };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function refreshPayrollDrafts(idToken: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    await syncDraftPayrollRuns();
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updatePayrollRun(idToken: string, month: string, lines: PayrollLine[]): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const snap = await runOf(month);
    const stored = snap ? mapPayrollRun(snap.id, snap.data() ?? {}) : null;
    if (!snap || !stored || stored.status !== "draft") return { ok: false, error: "pay.locked" };
    const next = cleanLines(stored.lines, lines);
    if (!next) return { ok: false, error: "pay.invalidMoney" };
    await snap.ref.update({ lines: next, updatedAt: FieldValue.serverTimestamp() });
    await audit("payroll.update", who.uid, month, String(next.length));
    return { ok: true, id: month };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function approvePayrollRun(idToken: string, month: string): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (who.role !== "superAdmin" && who.level("payroll") !== "approve") return { ok: false, error: "pay.forbidden" };
    const snap = await runOf(month);
    if (!snap || snap.data()?.status !== "draft") return { ok: false, error: "pay.locked" };
    await snap.ref.update({ status: "approved", approvedBy: who.uid, approvedAt: FieldValue.serverTimestamp() });
    await audit("payroll.approve", who.uid, month, "");
    return { ok: true, id: month };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function reopenPayrollRun(idToken: string, month: string): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (who.role !== "superAdmin" && who.level("payroll") !== "approve") return { ok: false, error: "pay.forbidden" };
    const snap = await runOf(month);
    if (!snap || snap.data()?.status !== "approved") return { ok: false, error: "pay.locked" };
    await snap.ref.update({ status: "draft", approvedBy: "", approvedAt: null });
    await audit("payroll.reopen", who.uid, month, "");
    return { ok: true, id: month };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function payPayrollRun(idToken: string, month: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const snap = await runOf(month);
    if (!snap || snap.data()?.status !== "approved") return { ok: false, error: "pay.locked" };
    await snap.ref.update({ status: "paid", paidBy: who.uid, paidAt: FieldValue.serverTimestamp() });
    await audit("payroll.pay", who.uid, month, "");
    return { ok: true, id: month };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deletePayrollRun(idToken: string, month: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const snap = await runOf(month);
    if (!snap || snap.data()?.status === "paid") return { ok: false, error: "pay.locked" };
    await snap.ref.delete();
    await audit("payroll.delete", who.uid, month, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}
