"use server";

import { updateTag } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { canReadAll, canWriteModule } from "@/lib/access";
import type { ActionResult } from "@/lib/directory";
import { adminDb } from "@/lib/firebase-admin";
import { qatarToday } from "@/lib/hr";
import { isOfferKind } from "@/lib/offers";
import { PROJECT_LIMITS, projectProblems, projectStatuses, type ProjectInput } from "@/lib/projects";
import { slugify } from "@/lib/website";
import { removePrivateFile, signedReadUrl } from "@/server/blobs";
import { projectInUse } from "@/server/project-link";
import { actor, audit } from "@/server/session";

/** Public pages that list projects use this cache tag. */
const SITE_TAG = "website";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

async function gate(idToken: string, write: boolean) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  const level = who.level("projects");
  if (write ? !canWriteModule(level) : !canReadAll(level)) return { error: "prj.forbidden" };
  return who;
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function clean(input: ProjectInput): ProjectInput | null {
  const project: ProjectInput = {
    nameEn: clip(input.nameEn, PROJECT_LIMITS.name),
    nameAr: clip(input.nameAr, PROJECT_LIMITS.name),
    kind: input.kind,
    status: input.status,
    clientEn: clip(input.clientEn, PROJECT_LIMITS.text),
    clientAr: clip(input.clientAr, PROJECT_LIMITS.text),
    clientPhone: clip(input.clientPhone, 20),
    clientEmail: clip(input.clientEmail, 120),
    clientIdNo: clip(input.clientIdNo, 20),
    clientAddressEn: clip(input.clientAddressEn, PROJECT_LIMITS.text),
    clientAddressAr: clip(input.clientAddressAr, PROJECT_LIMITS.text),
    locationEn: clip(input.locationEn, PROJECT_LIMITS.text),
    locationAr: clip(input.locationAr, PROJECT_LIMITS.text),
    budget: Number(input.budget),
    startOn: clip(input.startOn, 10),
    endOn: clip(input.endOn, 10),
    notesEn: clip(input.notesEn, PROJECT_LIMITS.description),
    notesAr: clip(input.notesAr, PROJECT_LIMITS.description),
    published: input.published === true,
    summaryEn: clip(input.summaryEn, PROJECT_LIMITS.summary),
    summaryAr: clip(input.summaryAr, PROJECT_LIMITS.summary),
  };
  if (!isOfferKind(project.kind) || !projectStatuses.includes(project.status)) return null;
  if (Object.keys(projectProblems(project)).length > 0) return null;
  return project;
}

async function nextCode() {
  const prefix = `PRJ-${qatarToday().slice(0, 4)}-`;
  const existing = await adminDb().collection("projects").get();
  const max = existing.docs.reduce((highest, doc) => {
    const code = typeof doc.data().code === "string" ? (doc.data().code as string) : "";
    const n = code.startsWith(prefix) ? Number(code.slice(prefix.length)) : 0;
    return Number.isInteger(n) ? Math.max(highest, n) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function uniqueSlug(name: string, ignoreId = "") {
  const base = slugify(name) || "project";
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await adminDb().collection("projects").where("slug", "==", candidate).limit(2).get();
    if (taken.docs.every((doc) => doc.id === ignoreId)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export async function createProject(idToken: string, input: ProjectInput): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const project = clean(input);
    if (!project) return fail("us.invalid");
    const ref = await adminDb().collection("projects").add({
      ...project,
      code: await nextCode(),
      slug: await uniqueSlug(project.nameEn),
      coverPath: "",
      coverType: "",
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("projects.create", who.uid, ref.id, project.nameEn);
    updateTag(SITE_TAG);
    return { ok: true, id: ref.id };
  } catch {
    return fail("auth.failed");
  }
}

export async function updateProject(idToken: string, projectId: string, input: ProjectInput): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const project = clean(input);
    if (!project) return fail("us.invalid");
    const ref = adminDb().collection("projects").doc(projectId);
    const snap = await ref.get();
    if (!snap.exists) return fail("us.invalid");
    const slug = typeof snap.data()?.slug === "string" && snap.data()?.slug ? snap.data()?.slug : await uniqueSlug(project.nameEn, projectId);
    await ref.update({ ...project, slug, updatedAt: FieldValue.serverTimestamp() });
    // Keep the project name stored on linked records in step with the project
    const renamed = snap.data()?.nameEn !== project.nameEn || snap.data()?.nameAr !== project.nameAr;
    if (renamed) {
      for (const name of ["projectReports", "bills", "expenses", "receipts", "invoices", "libraryDocuments"]) {
        const linked = await adminDb().collection(name).where("projectId", "==", projectId).get();
        await Promise.all(linked.docs.map((doc) => doc.ref.update({ projectEn: project.nameEn, projectAr: project.nameAr })));
      }
    }
    await audit("projects.update", who.uid, projectId, project.nameEn);
    updateTag(SITE_TAG);
    return { ok: true, id: projectId };
  } catch {
    return fail("auth.failed");
  }
}

export async function deleteProject(idToken: string, projectId: string): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const ref = adminDb().collection("projects").doc(projectId);
    const snap = await ref.get();
    if (!snap.exists) return fail("us.invalid");
    if (await projectInUse(projectId)) return fail("prj.inUse");
    const cover = snap.data()?.coverPath;
    if (typeof cover === "string" && cover) await removePrivateFile(cover);
    await ref.delete();
    await audit("projects.delete", who.uid, projectId, String(snap.data()?.nameEn ?? ""));
    updateTag(SITE_TAG);
    return { ok: true };
  } catch {
    return fail("auth.failed");
  }
}

export async function clearProjectCover(idToken: string, projectId: string): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const ref = adminDb().collection("projects").doc(projectId);
    const snap = await ref.get();
    if (!snap.exists) return fail("us.invalid");
    const cover = snap.data()?.coverPath;
    if (typeof cover === "string" && cover) await removePrivateFile(cover);
    await ref.update({ coverPath: "", coverType: "" });
    updateTag(SITE_TAG);
    return { ok: true };
  } catch {
    return fail("auth.failed");
  }
}

export async function openProjectCover(idToken: string, projectId: string): Promise<{ ok: true; url: string } | Fail> {
  try {
    const who = await gate(idToken, false);
    if ("error" in who) return fail(who.error);
    const snap = await adminDb().collection("projects").doc(projectId).get();
    const path = snap.data()?.coverPath;
    if (!snap.exists || typeof path !== "string" || !path.startsWith("website/")) return fail("us.invalid");
    return { ok: true, url: await signedReadUrl(path) };
  } catch {
    return fail("auth.failed");
  }
}
