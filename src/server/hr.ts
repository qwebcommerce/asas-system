"use server";

import { FieldValue } from "firebase-admin/firestore";
import { isDepartment, type Department } from "@/lib/directory";
import { applicantStages, attendanceStatuses, currentMonthKey, hrDocStatuses, leaveKinds, type ApplicantStage, type AttendanceStatus, type HrDocStatus, type LeaveKind } from "@/lib/hr";
import { adminDb } from "@/lib/firebase-admin";
import { actor, audit, canManageHr } from "@/server/session";
import type { ActionResult } from "@/lib/directory";

function day(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

async function manager(idToken: string) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  if (!canManageHr(who.role)) return { error: "hr.forbidden" as const };
  return who;
}

export async function createEmployee(
  idToken: string,
  input: { name: string; employeeId: string; positionEn: string; positionAr: string; department: Department; mobile: string; joined: string; userId: string },
): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const name = input.name.trim();
    const employeeId = input.employeeId.trim();
    const positionEn = input.positionEn.trim();
    const positionAr = input.positionAr.trim() || positionEn;
    if (!name || !employeeId || !positionEn || !isDepartment(input.department)) return { ok: false, error: "us.invalid" };
    const existing = await adminDb().collection("employees").where("employeeId", "==", employeeId).limit(1).get();
    if (!existing.empty) return { ok: false, error: "us.exists" };

    let userId = input.userId.trim();
    if (!userId) {
      const match = await adminDb().collection("users").where("employeeId", "==", employeeId).limit(1).get();
      userId = match.docs[0]?.id ?? "";
    }
    const ref = await adminDb().collection("employees").add({
      name,
      employeeId,
      positionEn,
      positionAr,
      department: input.department,
      mobile: input.mobile.trim(),
      joined: day(input.joined),
      status: "present",
      userId,
      idExpiry: "",
      passportExpiry: "",
      visaExpiry: "",
      bankName: "",
      ibanLast4: "",
      basic: null,
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("hr.employee", who.uid, ref.id, employeeId);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateEmployee(
  idToken: string,
  input: { id: string; status: AttendanceStatus; idExpiry: string; passportExpiry: string; visaExpiry: string; bankName: string; ibanLast4: string; basic: number | null },
): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!attendanceStatuses.includes(input.status)) return { ok: false, error: "us.invalid" };
    const ibanLast4 = input.ibanLast4.trim();
    if (ibanLast4 && !/^\d{4}$/.test(ibanLast4)) return { ok: false, error: "us.invalid" };
    await adminDb().collection("employees").doc(input.id).update({
      status: input.status,
      idExpiry: day(input.idExpiry),
      passportExpiry: day(input.passportExpiry),
      visaExpiry: day(input.visaExpiry),
      bankName: input.bankName.trim(),
      ibanLast4,
      basic: input.basic !== null && Number.isFinite(input.basic) && input.basic >= 0 ? input.basic : null,
    });
    await audit("hr.employee.update", who.uid, input.id, input.status);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function createLeaveRequest(idToken: string, input: { employeeId: string; kind: LeaveKind; days: number; note: string }): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!leaveKinds.includes(input.kind) || !Number.isInteger(input.days) || input.days < 1 || input.days > 60) return { ok: false, error: "us.invalid" };
    const employee = await adminDb().collection("employees").doc(input.employeeId).get();
    if (!employee.exists) return { ok: false, error: "us.invalid" };
    const data = employee.data() ?? {};
    const owner = typeof data.userId === "string" ? data.userId : "";
    if (!canManageHr(who.role) && owner !== who.uid) return { ok: false, error: "hr.forbidden" };
    const ref = await adminDb().collection("leaveRequests").add({
      employeeId: input.employeeId,
      userId: owner,
      name: typeof data.name === "string" ? data.name : "",
      kind: input.kind,
      days: input.days,
      note: input.note.trim(),
      status: "pending",
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("hr.leave", who.uid, ref.id, input.kind);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function reviewLeave(idToken: string, requestId: string, decision: "approved" | "declined"): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const ref = adminDb().collection("leaveRequests").doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    await ref.update({ status: decision, reviewedBy: who.uid, reviewedAt: FieldValue.serverTimestamp() });
    if (decision === "approved") {
      const employeeId = snap.data()?.employeeId;
      const kind = snap.data()?.kind;
      if (typeof employeeId === "string" && (kind === "annual" || kind === "sick")) {
        await adminDb().collection("employees").doc(employeeId).update({ status: kind });
      }
    }
    await audit(`hr.leave.${decision}`, who.uid, requestId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function sendAttendanceReport(idToken: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const monthKey = currentMonthKey();
    const ref = adminDb().collection("attendanceReports").doc(monthKey);
    const existing = await ref.get();
    if (existing.exists) return { ok: false, error: "hr.sentAlready" };
    const employees = await adminDb().collection("employees").get();
    const rows = employees.docs.map((item) => item.data());
    await ref.set({
      monthKey,
      sentBy: who.uid,
      sentAt: FieldValue.serverTimestamp(),
      employees: rows.length,
      present: rows.filter((row) => row.status === "present" || !row.status).length,
      late: rows.filter((row) => row.status === "late").length,
      onLeave: rows.filter((row) => row.status === "annual" || row.status === "sick").length,
      lines: rows.map((row) => ({
        employeeId: typeof row.employeeId === "string" ? row.employeeId : "",
        name: typeof row.name === "string" ? row.name : "",
        status: typeof row.status === "string" ? row.status : "present",
      })),
    });
    await audit("hr.attendance.send", who.uid, monthKey, String(rows.length));
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function createJob(idToken: string, input: { titleEn: string; titleAr: string; department: Department }): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const titleEn = input.titleEn.trim();
    const titleAr = input.titleAr.trim() || titleEn;
    if (!titleEn || !isDepartment(input.department)) return { ok: false, error: "us.invalid" };
    const ref = await adminDb().collection("jobs").add({
      titleEn,
      titleAr,
      department: input.department,
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("hr.job", who.uid, ref.id, titleEn);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function createApplicant(idToken: string, input: { jobId: string; name: string; score: number | null; note: string }): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const name = input.name.trim();
    const job = await adminDb().collection("jobs").doc(input.jobId).get();
    if (!name || !job.exists) return { ok: false, error: "us.invalid" };
    const score = input.score !== null && Number.isFinite(input.score) ? Math.max(0, Math.min(100, Math.round(input.score))) : null;
    const ref = await adminDb().collection("applicants").add({
      jobId: input.jobId,
      name,
      score,
      note: input.note.trim(),
      stage: "new",
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("hr.applicant", who.uid, ref.id, name);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function setApplicantStage(idToken: string, applicantId: string, stage: ApplicantStage): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!applicantStages.includes(stage)) return { ok: false, error: "us.invalid" };
    await adminDb().collection("applicants").doc(applicantId).update({ stage });
    await audit("hr.applicant.stage", who.uid, applicantId, stage);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function createHrDocument(
  idToken: string,
  input: { titleEn: string; titleAr: string; status: HrDocStatus; expiresAt: string },
): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const titleEn = input.titleEn.trim();
    const titleAr = input.titleAr.trim() || titleEn;
    if (!titleEn || !hrDocStatuses.includes(input.status)) return { ok: false, error: "us.invalid" };
    const ref = await adminDb().collection("hrDocuments").add({
      titleEn,
      titleAr,
      status: input.status,
      expiresAt: day(input.expiresAt),
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("hr.document", who.uid, ref.id, titleEn);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}
