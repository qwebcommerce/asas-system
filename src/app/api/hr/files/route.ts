import { FieldValue } from "firebase-admin/firestore";
import { fileProblem, type StoredType } from "@/lib/files";
import { adminDb } from "@/lib/firebase-admin";
import { removePrivateFile, savePrivateFile } from "@/server/blobs";
import { actor, audit, canManageHr, canManageReports } from "@/server/session";

export const instant = false;

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const who = await actor(text(form.get("token")));
    if ("error" in who) return Response.json({ ok: false, error: who.error });
    const purpose = text(form.get("purpose"));
    if (purpose === "report") {
      if (!canManageReports(who.role)) return Response.json({ ok: false, error: "rep.forbidden" });
    } else if (!canManageHr(who.role)) {
      return Response.json({ ok: false, error: "hr.forbidden" });
    }
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ ok: false, error: "hr.fileType" });
    const problem = fileProblem(file.type, file.size);
    if (problem) return Response.json({ ok: false, error: problem });
    const bytes = Buffer.from(await file.arrayBuffer());
    const type = file.type as StoredType;

    if (purpose === "employee" || purpose === "employee-update") {
      const employeeId = text(form.get("employeeId"));
      const titleEn = text(form.get("titleEn"));
      const titleAr = text(form.get("titleAr"));
      const fileId = text(form.get("fileId"));
      if (!employeeId || !titleEn || !titleAr) return Response.json({ ok: false, error: "us.invalid" });
      const employee = await adminDb().collection("employees").doc(employeeId).get();
      if (!employee.exists) return Response.json({ ok: false, error: "us.invalid" });
      const userId = typeof employee.data()?.userId === "string" ? employee.data()?.userId : "";
      if (purpose === "employee-update") {
        const ref = adminDb().collection("employeeFiles").doc(fileId);
        const snap = await ref.get();
        if (!fileId || !snap.exists || snap.data()?.employeeId !== employeeId) return Response.json({ ok: false, error: "us.invalid" });
        const previous = typeof snap.data()?.storagePath === "string" ? snap.data()?.storagePath : "";
        const storagePath = await savePrivateFile(`employees/${employeeId}`, type, bytes);
        await ref.update({ titleEn, titleAr, userId, contentType: type, size: file.size, storagePath });
        if (previous) await removePrivateFile(previous);
        await audit("hr.file.update", who.uid, fileId, titleEn);
        return Response.json({ ok: true, id: fileId });
      }
      const storagePath = await savePrivateFile(`employees/${employeeId}`, type, bytes);
      const ref = await adminDb().collection("employeeFiles").add({
        employeeId,
        userId,
        titleEn,
        titleAr,
        contentType: type,
        size: file.size,
        storagePath,
        createdBy: who.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      await audit("hr.file", who.uid, ref.id, titleEn);
      return Response.json({ ok: true, id: ref.id });
    }

    if (purpose === "hr") {
      const documentId = text(form.get("documentId"));
      const ref = adminDb().collection("hrDocuments").doc(documentId);
      const snap = await ref.get();
      if (!documentId || !snap.exists) return Response.json({ ok: false, error: "us.invalid" });
      const previous = typeof snap.data()?.storagePath === "string" ? snap.data()?.storagePath : "";
      const storagePath = await savePrivateFile(`hr-documents/${documentId}`, type, bytes);
      await ref.update({ storagePath, contentType: type, size: file.size });
      if (previous) await removePrivateFile(previous);
      await audit("hr.document.file", who.uid, documentId, type);
      return Response.json({ ok: true, id: documentId });
    }

    if (purpose === "report") {
      const reportId = text(form.get("reportId"));
      const name = (text(form.get("name")) || file.name).slice(0, 120);
      const report = await adminDb().collection("projectReports").doc(reportId).get();
      if (!reportId || !report.exists || !name) return Response.json({ ok: false, error: "us.invalid" });
      const existing = await adminDb().collection("reportFiles").where("reportId", "==", reportId).get();
      if (existing.size >= 10) return Response.json({ ok: false, error: "rep.fileLimit" });
      const storagePath = await savePrivateFile(`project-reports/${reportId}`, type, bytes);
      const ref = await adminDb().collection("reportFiles").add({
        reportId,
        name,
        contentType: type,
        size: file.size,
        storagePath,
        createdBy: who.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      await audit("reports.file", who.uid, ref.id, name);
      return Response.json({ ok: true, id: ref.id });
    }

    return Response.json({ ok: false, error: "us.invalid" });
  } catch {
    return Response.json({ ok: false, error: "auth.failed" });
  }
}
