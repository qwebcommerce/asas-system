"use server";

import { FieldValue } from "firebase-admin/firestore";
import type { ActionResult } from "@/lib/directory";
import { documentKinds, type LibraryDocumentInput } from "@/lib/documents";
import { adminDb } from "@/lib/firebase-admin";
import { removePrivateFile, signedReadUrl } from "@/server/blobs";
import { canReadAll, canWriteModule, seesOwn } from "@/lib/access";
import { actor, audit, type Gate } from "@/server/session";

function clean(input: LibraryDocumentInput): LibraryDocumentInput | null {
  const titleEn = input.titleEn.trim().slice(0, 160);
  const titleAr = input.titleAr.trim().slice(0, 160);
  const projectEn = input.projectEn.trim().slice(0, 120);
  const projectAr = input.projectAr.trim().slice(0, 120);
  if (!titleEn || !titleAr || !documentKinds.includes(input.kind)) return null;
  const expiresOn = /^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn) ? input.expiresOn : "";
  if (input.hasExpiry && !expiresOn) return null;
  return { titleEn, titleAr, kind: input.kind, projectEn, projectAr, hasExpiry: input.hasExpiry && Boolean(expiresOn), expiresOn: input.hasExpiry ? expiresOn : "" };
}

async function reader(idToken: string) {
  return actor(idToken);
}

function canEditDocument(who: Gate, owner: string) {
  const level = who.level("documents");
  if (canWriteModule(level)) return true;
  return seesOwn(level) && owner === who.uid;
}

function canReadDocument(who: Gate, owner: string) {
  const level = who.level("documents");
  if (canReadAll(level)) return true;
  return seesOwn(level) && owner === who.uid;
}

async function editable(idToken: string, documentId: string) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  const snap = await adminDb().collection("libraryDocuments").doc(documentId).get();
  if (!snap.exists) return { error: "us.invalid" as const };
  const owner = typeof snap.data()?.createdBy === "string" ? snap.data()?.createdBy : "";
  if (!canEditDocument(who, owner)) return { error: "doc.forbidden" as const };
  return { who, snap };
}

export async function createLibraryDocument(idToken: string, input: LibraryDocumentInput): Promise<ActionResult> {
  try {
    const who = await reader(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!canEditDocument(who, who.uid)) return { ok: false, error: "doc.forbidden" };
    const document = clean(input);
    if (!document) return { ok: false, error: "us.invalid" };
    const ref = await adminDb().collection("libraryDocuments").add({
      ...document,
      storagePath: "",
      contentType: "",
      size: 0,
      version: 1,
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("documents.create", who.uid, ref.id, document.titleEn);
    return { ok: true, id: ref.id };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateLibraryDocument(idToken: string, documentId: string, input: LibraryDocumentInput): Promise<ActionResult> {
  try {
    const access = await editable(idToken, documentId);
    if ("error" in access) return { ok: false, error: access.error };
    const document = clean(input);
    if (!document) return { ok: false, error: "us.invalid" };
    await access.snap.ref.update({ ...document, updatedAt: FieldValue.serverTimestamp() });
    await audit("documents.update", access.who.uid, documentId, document.titleEn);
    return { ok: true, id: documentId };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function clearLibraryFile(idToken: string, documentId: string): Promise<ActionResult> {
  try {
    const access = await editable(idToken, documentId);
    if ("error" in access) return { ok: false, error: access.error };
    const path = typeof access.snap.data()?.storagePath === "string" ? access.snap.data()?.storagePath : "";
    if (path) await removePrivateFile(path);
    await access.snap.ref.update({ storagePath: "", contentType: "", size: 0 });
    await audit("documents.file.delete", access.who.uid, documentId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteLibraryDocument(idToken: string, documentId: string): Promise<ActionResult> {
  try {
    const access = await editable(idToken, documentId);
    if ("error" in access) return { ok: false, error: access.error };
    const path = typeof access.snap.data()?.storagePath === "string" ? access.snap.data()?.storagePath : "";
    if (path) await removePrivateFile(path);
    await access.snap.ref.delete();
    await audit("documents.delete", access.who.uid, documentId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function openLibraryFile(idToken: string, documentId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const who = await reader(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const snap = await adminDb().collection("libraryDocuments").doc(documentId).get();
    const owner = typeof snap.data()?.createdBy === "string" ? snap.data()?.createdBy : "";
    if (!snap.exists || !canReadDocument(who, owner)) return { ok: false, error: "doc.forbidden" };
    const path = snap.data()?.storagePath;
    if (!snap.exists || typeof path !== "string" || !path.startsWith("library/")) return { ok: false, error: "us.invalid" };
    return { ok: true, url: await signedReadUrl(path) };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}
