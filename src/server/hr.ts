"use server";

import { FieldValue } from "firebase-admin/firestore";
import { isDepartment, type Department } from "@/lib/directory";
import { applicantStages, attendanceStatuses, currentMonthKey, hrDocStatuses, inclusiveDays, leaveKinds, qatarToday, type ApplicantStage, type AttendanceStatus, type HrDocStatus, type LeaveKind } from "@/lib/hr";
import { adminDb } from "@/lib/firebase-admin";
import { removePrivateFile, signedReadUrl } from "@/server/blobs";
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
      employment: "active",
      userId,
      idExpiry: "",
      passportExpiry: "",
      visaExpiry: "",
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
  input: {
    id: string;
    name: string;
    employeeId: string;
    positionEn: string;
    positionAr: string;
    department: Department;
    mobile: string;
    joined: string;
    userId: string;
    employment: "active" | "inactive";
    idExpiry: string;
    passportExpiry: string;
    visaExpiry: string;
    basic: number | null;
  },
): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const name = input.name.trim();
    const employeeId = input.employeeId.trim();
    const positionEn = input.positionEn.trim();
    const positionAr = input.positionAr.trim() || positionEn;
    if (!name || !employeeId || !positionEn || !isDepartment(input.department) || (input.employment !== "active" && input.employment !== "inactive")) return { ok: false, error: "us.invalid" };
    const existing = await adminDb().collection("employees").where("employeeId", "==", employeeId).limit(1).get();
    if (!existing.empty && existing.docs[0]?.id !== input.id) return { ok: false, error: "us.exists" };
    let userId = input.userId.trim();
    if (!userId) {
      const match = await adminDb().collection("users").where("employeeId", "==", employeeId).limit(1).get();
      userId = match.docs[0]?.id ?? "";
    }
    await adminDb().collection("employees").doc(input.id).update({
      name,
      employeeId,
      positionEn,
      positionAr,
      department: input.department,
      mobile: input.mobile.trim(),
      joined: day(input.joined),
      userId,
      employment: input.employment,
      idExpiry: day(input.idExpiry),
      passportExpiry: day(input.passportExpiry),
      visaExpiry: day(input.visaExpiry),
      bankName: FieldValue.delete(),
      ibanLast4: FieldValue.delete(),
      basic: input.basic !== null && Number.isFinite(input.basic) && input.basic >= 0 ? input.basic : null,
    });
    await audit("hr.employee.update", who.uid, input.id, employeeId);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function saveTodayAttendance(idToken: string, lines: { employeeId: string; status: AttendanceStatus }[]): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const date = qatarToday();
    const employees = await adminDb().collection("employees").get();
    const byId = new Map(employees.docs.map((item) => [item.id, item.data()]));
    const batch = adminDb().batch();
    const seen = new Set<string>();
    for (const line of lines) {
      if (seen.has(line.employeeId) || !attendanceStatuses.includes(line.status)) return { ok: false, error: "us.invalid" };
      seen.add(line.employeeId);
      const data = byId.get(line.employeeId);
      if (!data || data.employment === "inactive") continue;
      batch.set(adminDb().collection("attendanceMarks").doc(`${line.employeeId}_${date}`), {
        employeeId: line.employeeId,
        userId: typeof data.userId === "string" ? data.userId : "",
        date,
        status: line.status,
        updatedBy: who.uid,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
    await audit("hr.attendance", who.uid, date, String(seen.size));
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteEmployee(idToken: string, employeeId: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const ref = adminDb().collection("employees").doc(employeeId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const leaves = await adminDb().collection("leaveRequests").where("employeeId", "==", employeeId).get();
    const marks = await adminDb().collection("attendanceMarks").where("employeeId", "==", employeeId).get();
    const files = await adminDb().collection("employeeFiles").where("employeeId", "==", employeeId).get();
    const paths = files.docs.map((item) => (typeof item.data().storagePath === "string" ? item.data().storagePath : ""));
    const batch = adminDb().batch();
    leaves.docs.forEach((item) => batch.delete(item.ref));
    marks.docs.forEach((item) => batch.delete(item.ref));
    files.docs.forEach((item) => batch.delete(item.ref));
    batch.delete(ref);
    await batch.commit();
    await Promise.all(paths.filter(Boolean).map((path) => removePrivateFile(path)));
    await audit("hr.employee.delete", who.uid, employeeId, typeof snap.data()?.employeeId === "string" ? snap.data()?.employeeId : "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

function leaveSpan(input: { kind: LeaveKind; days: number; startsOn?: string; endsOn?: string }) {
  if (!leaveKinds.includes(input.kind)) return null;
  if (input.kind === "sick") {
    const startsOn = day(input.startsOn ?? "");
    const endsOn = day(input.endsOn ?? "");
    const days = inclusiveDays(startsOn, endsOn);
    if (!startsOn || days < 1 || days > 60) return null;
    return { days, startsOn, endsOn };
  }
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 60) return null;
  return { days: input.days, startsOn: "", endsOn: "" };
}

async function markApprovedLeave(employeeId: string, owner: string, kind: LeaveKind, startsOn: string, endsOn: string, uid: string) {
  const date = qatarToday();
  if (kind === "sick" && (date < startsOn || date > endsOn)) return;
  await adminDb().collection("attendanceMarks").doc(`${employeeId}_${date}`).set({
    employeeId,
    userId: owner,
    date,
    status: kind,
    updatedBy: uid,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function createLeaveRequest(idToken: string, input: { employeeId: string; kind: LeaveKind; days: number; note: string; startsOn?: string; endsOn?: string }): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const span = leaveSpan(input);
    if (!span) return { ok: false, error: "us.invalid" };
    const employee = await adminDb().collection("employees").doc(input.employeeId).get();
    if (!employee.exists) return { ok: false, error: "us.invalid" };
    const data = employee.data() ?? {};
    const owner = typeof data.userId === "string" ? data.userId : "";
    if (!canManageHr(who.role) && owner !== who.uid) return { ok: false, error: "hr.forbidden" };
    const managerRole = canManageHr(who.role);
    const ref = await adminDb().collection("leaveRequests").add({
      employeeId: input.employeeId,
      userId: owner,
      name: typeof data.name === "string" ? data.name : "",
      kind: input.kind,
      days: span.days,
      ...(span.startsOn ? { startsOn: span.startsOn, endsOn: span.endsOn } : {}),
      note: input.note.trim(),
      status: managerRole ? "approved" : "pending",
      ...(managerRole ? { reviewedBy: who.uid, reviewedAt: FieldValue.serverTimestamp() } : {}),
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (managerRole) await markApprovedLeave(input.employeeId, owner, input.kind, span.startsOn, span.endsOn, who.uid);
    await audit("hr.leave", who.uid, ref.id, input.kind);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateLeaveRequest(
  idToken: string,
  requestId: string,
  input: { employeeId: string; kind: LeaveKind; days: number; note: string; startsOn?: string; endsOn?: string },
): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const span = leaveSpan(input);
    if (!span) return { ok: false, error: "us.invalid" };
    const ref = adminDb().collection("leaveRequests").doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const current = snap.data() ?? {};
    const managerRole = canManageHr(who.role);
    if (!managerRole && (current.userId !== who.uid || current.status !== "pending")) return { ok: false, error: "hr.forbidden" };
    const employee = await adminDb().collection("employees").doc(input.employeeId).get();
    if (!employee.exists) return { ok: false, error: "us.invalid" };
    const data = employee.data() ?? {};
    const owner = typeof data.userId === "string" ? data.userId : "";
    if (!managerRole && owner !== who.uid) return { ok: false, error: "hr.forbidden" };
    await ref.update({
      employeeId: input.employeeId,
      userId: owner,
      name: typeof data.name === "string" ? data.name : "",
      kind: input.kind,
      days: span.days,
      startsOn: span.startsOn ? span.startsOn : FieldValue.delete(),
      endsOn: span.endsOn ? span.endsOn : FieldValue.delete(),
      note: input.note.trim(),
    });
    if (managerRole && current.status === "approved" && (input.kind === "annual" || input.kind === "sick")) {
      await markApprovedLeave(input.employeeId, owner, input.kind, span.startsOn, span.endsOn, who.uid);
    }
    await audit("hr.leave.update", who.uid, requestId, input.kind);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteLeaveRequest(idToken: string, requestId: string): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const ref = adminDb().collection("leaveRequests").doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const current = snap.data() ?? {};
    if (!canManageHr(who.role) && (current.userId !== who.uid || current.status !== "pending")) return { ok: false, error: "hr.forbidden" };
    await ref.delete();
    await audit("hr.leave.delete", who.uid, requestId, "");
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
      const data = snap.data() ?? {};
      const employeeId = data.employeeId;
      const kind = data.kind;
      if (typeof employeeId === "string" && (kind === "annual" || kind === "sick")) {
        const employee = await adminDb().collection("employees").doc(employeeId).get();
        const owner = typeof employee.data()?.userId === "string" ? employee.data()?.userId : "";
        const startsOn = typeof data.startsOn === "string" ? data.startsOn : "";
        const endsOn = typeof data.endsOn === "string" ? data.endsOn : "";
        await markApprovedLeave(employeeId, owner, kind, startsOn, endsOn, who.uid);
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
    const date = qatarToday();
    const employees = await adminDb().collection("employees").get();
    const marks = await adminDb().collection("attendanceMarks").where("date", "==", date).get();
    const saved = new Map(marks.docs.map((item) => [item.data().employeeId, item.data().status]));
    const rows = employees.docs
      .map((item) => {
        const data = item.data();
        return {
          id: item.id,
          employeeId: typeof data.employeeId === "string" ? data.employeeId : "",
          name: typeof data.name === "string" ? data.name : "",
          employment: data.employment === "inactive" ? "inactive" : "active",
        };
      })
      .filter((row) => row.employment !== "inactive");
    const statusOf = (id: string) => {
      const value = saved.get(id);
      return typeof value === "string" && attendanceStatuses.includes(value as AttendanceStatus) ? value : "present";
    };
    await ref.set({
      monthKey,
      sentBy: who.uid,
      sentAt: FieldValue.serverTimestamp(),
      employees: rows.length,
      present: rows.filter((row) => statusOf(row.id) === "present").length,
      late: rows.filter((row) => statusOf(row.id) === "late").length,
      absent: rows.filter((row) => statusOf(row.id) === "absent").length,
      onLeave: rows.filter((row) => statusOf(row.id) === "annual" || statusOf(row.id) === "sick").length,
      lines: rows.map((row) => ({
        employeeId: row.employeeId,
        name: row.name,
        status: statusOf(row.id),
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
    const titleAr = input.titleAr.trim();
    if (!titleEn || !titleAr || !isDepartment(input.department)) return { ok: false, error: "us.invalid" };
    const ref = await adminDb().collection("jobs").add({
      titleEn,
      titleAr,
      department: input.department,
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("hr.job", who.uid, ref.id, titleEn);
    return { ok: true, id: ref.id };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateJob(idToken: string, jobId: string, input: { titleEn: string; titleAr: string; department: Department }): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const titleEn = input.titleEn.trim();
    const titleAr = input.titleAr.trim();
    if (!titleEn || !titleAr || !isDepartment(input.department)) return { ok: false, error: "us.invalid" };
    const ref = adminDb().collection("jobs").doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    await ref.update({ titleEn, titleAr, department: input.department });
    await audit("hr.job.update", who.uid, jobId, titleEn);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteJob(idToken: string, jobId: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const ref = adminDb().collection("jobs").doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const applicants = await adminDb().collection("applicants").where("jobId", "==", jobId).get();
    const batch = adminDb().batch();
    applicants.docs.forEach((item) => batch.delete(item.ref));
    batch.delete(ref);
    await batch.commit();
    await audit("hr.job.delete", who.uid, jobId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function createApplicant(idToken: string, input: { jobId: string; name: string; score: number | null; note: string; stage?: ApplicantStage }): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const name = input.name.trim();
    const job = await adminDb().collection("jobs").doc(input.jobId).get();
    const stage = input.stage && applicantStages.includes(input.stage) ? input.stage : "new";
    if (!name || !job.exists) return { ok: false, error: "us.invalid" };
    const score = input.score !== null && Number.isFinite(input.score) ? Math.max(0, Math.min(100, Math.round(input.score))) : null;
    const ref = await adminDb().collection("applicants").add({
      jobId: input.jobId,
      name,
      score,
      note: input.note.trim(),
      stage,
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("hr.applicant", who.uid, ref.id, name);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateApplicant(
  idToken: string,
  applicantId: string,
  input: { jobId: string; name: string; score: number | null; note: string; stage: ApplicantStage },
): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const name = input.name.trim();
    const job = await adminDb().collection("jobs").doc(input.jobId).get();
    if (!name || !job.exists || !applicantStages.includes(input.stage)) return { ok: false, error: "us.invalid" };
    const ref = adminDb().collection("applicants").doc(applicantId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const score = input.score !== null && Number.isFinite(input.score) ? Math.max(0, Math.min(100, Math.round(input.score))) : null;
    await ref.update({ jobId: input.jobId, name, score, note: input.note.trim(), stage: input.stage });
    await audit("hr.applicant.update", who.uid, applicantId, name);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteApplicant(idToken: string, applicantId: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const ref = adminDb().collection("applicants").doc(applicantId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    await ref.delete();
    await audit("hr.applicant.delete", who.uid, applicantId, "");
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
    const titleAr = input.titleAr.trim();
    if (!titleEn || !titleAr || !hrDocStatuses.includes(input.status)) return { ok: false, error: "us.invalid" };
    const ref = await adminDb().collection("hrDocuments").add({
      titleEn,
      titleAr,
      status: input.status,
      expiresAt: day(input.expiresAt),
      storagePath: "",
      contentType: "",
      size: 0,
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("hr.document", who.uid, ref.id, titleEn);
    return { ok: true, id: ref.id };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateHrDocument(
  idToken: string,
  documentId: string,
  input: { titleEn: string; titleAr: string; status: HrDocStatus; expiresAt: string },
): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const titleEn = input.titleEn.trim();
    const titleAr = input.titleAr.trim();
    if (!titleEn || !titleAr || !hrDocStatuses.includes(input.status)) return { ok: false, error: "us.invalid" };
    const ref = adminDb().collection("hrDocuments").doc(documentId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    await ref.update({ titleEn, titleAr, status: input.status, expiresAt: day(input.expiresAt) });
    await audit("hr.document.update", who.uid, documentId, titleEn);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteHrDocument(idToken: string, documentId: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const ref = adminDb().collection("hrDocuments").doc(documentId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const path = typeof snap.data()?.storagePath === "string" ? snap.data()?.storagePath : "";
    if (path) await removePrivateFile(path);
    await ref.delete();
    await audit("hr.document.delete", who.uid, documentId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function clearHrDocumentFile(idToken: string, documentId: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const ref = adminDb().collection("hrDocuments").doc(documentId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const path = typeof snap.data()?.storagePath === "string" ? snap.data()?.storagePath : "";
    await ref.update({ storagePath: "", contentType: "", size: 0 });
    if (path) await removePrivateFile(path);
    await audit("hr.document.file.delete", who.uid, documentId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateEmployeeFile(idToken: string, fileId: string, input: { titleEn: string; titleAr: string }): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const titleEn = input.titleEn.trim();
    const titleAr = input.titleAr.trim();
    if (!titleEn || !titleAr) return { ok: false, error: "us.invalid" };
    const ref = adminDb().collection("employeeFiles").doc(fileId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    await ref.update({ titleEn, titleAr });
    await audit("hr.file.update", who.uid, fileId, titleEn);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteEmployeeFile(idToken: string, fileId: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const ref = adminDb().collection("employeeFiles").doc(fileId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const path = typeof snap.data()?.storagePath === "string" ? snap.data()?.storagePath : "";
    if (path) await removePrivateFile(path);
    await ref.delete();
    await audit("hr.file.delete", who.uid, fileId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function openStoredFile(idToken: string, kind: "employee" | "hr", recordId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const collectionName = kind === "employee" ? "employeeFiles" : "hrDocuments";
    const snap = await adminDb().collection(collectionName).doc(recordId).get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const data = snap.data() ?? {};
    const path = typeof data.storagePath === "string" ? data.storagePath : "";
    if (!path) return { ok: false, error: "us.invalid" };
    const allowed = canManageHr(who.role) || who.role === "accountant" || (kind === "employee" && data.userId === who.uid);
    if (!allowed) return { ok: false, error: "hr.forbidden" };
    return { ok: true, url: await signedReadUrl(path) };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}
