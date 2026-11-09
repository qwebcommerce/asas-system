import { FieldValue } from "firebase-admin/firestore";
import { fileProblem } from "@/lib/files";
import { adminDb } from "@/lib/firebase-admin";
import { acceptedFile, removePrivateFile, savePrivateFile } from "@/server/blobs";
import { canWriteModule, seesOwn } from "@/lib/access";
import { actor, audit } from "@/server/session";

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
      const level = who.level("reports");
      if (!canWriteModule(level) && !seesOwn(level)) return Response.json({ ok: false, error: "rep.forbidden" });
    } else if (purpose === "library") {
      const level = who.level("documents");
      if (!canWriteModule(level) && !seesOwn(level)) return Response.json({ ok: false, error: "doc.forbidden" });
    } else if (!canWriteModule(who.level("hr"))) {
      return Response.json({ ok: false, error: "hr.forbidden" });
    }
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ ok: false, error: "hr.fileType" });
    const type = acceptedFile(file.type, file.size, file.name);
    if (!type) return Response.json({ ok: false, error: fileProblem(file.type, file.size, file.name) ?? "hr.fileType" });
    const bytes = Buffer.from(await file.arrayBuffer());

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

    if (purpose === "library") {
      const documentId = text(form.get("documentId"));
      const ref = adminDb().collection("libraryDocuments").doc(documentId);
      const snap = await ref.get();
      const owner = typeof snap.data()?.createdBy === "string" ? snap.data()?.createdBy : "";
      const documentsLevel = who.level("documents");
      const canEdit = canWriteModule(documentsLevel) || (seesOwn(documentsLevel) && owner === who.uid);
      if (!documentId || !snap.exists || !canEdit) {
        return Response.json({ ok: false, error: "doc.forbidden" });
      }
      const previous = typeof snap.data()?.storagePath === "string" ? snap.data()?.storagePath : "";
      const storagePath = await savePrivateFile(`library/${documentId}`, type, bytes);
      const version = typeof snap.data()?.version === "number" ? snap.data()?.version : 1;
      await ref.update({ storagePath, contentType: type, size: file.size, version: previous ? version + 1 : version });
      if (previous) await removePrivateFile(previous);
      await audit("documents.file", who.uid, documentId, type);
      return Response.json({ ok: true, id: documentId });
    }

    if (purpose === "report") {
      const reportId = text(form.get("reportId"));
      const name = (text(form.get("name")) || file.name).slice(0, 120);
      const report = await adminDb().collection("projectReports").doc(reportId).get();
      const reportOwner = typeof report.data()?.createdBy === "string" ? report.data()?.createdBy : "";
      if (!reportId || !report.exists || !name) return Response.json({ ok: false, error: "us.invalid" });
      if (!canWriteModule(who.level("reports")) && reportOwner !== who.uid) return Response.json({ ok: false, error: "rep.forbidden" });
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
