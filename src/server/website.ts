"use server";

import { updateTag } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { canReadAll, canWriteModule } from "@/lib/access";
import type { ActionResult } from "@/lib/directory";
import { adminDb } from "@/lib/firebase-admin";
import {
  LIMITS,
  blogCategories,
  estimateMinutes,
  fileNameProblem,
  isDay,
  publishStates,
  siteDocCategories,
  slugify,
  stripPdf,
  type BlogPostInput,
  type SiteDocumentInput,
} from "@/lib/website";
import { removePrivateFile, signedReadUrl } from "@/server/blobs";
import { actor, audit } from "@/server/session";

/** Cache tag of the public pages that show website content. */
const SITE_TAG = "website";

const POSTS = "blogPosts";
const DOCS = "siteDocuments";

type Fail = { ok: false; error: string };

async function gate(idToken: string, write: boolean) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  const level = who.level("website");
  if (write ? !canWriteModule(level) : !canReadAll(level)) return { error: "web.forbidden" };
  return who;
}

function trimmed(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanPost(input: BlogPostInput): Omit<BlogPostInput, never> | null {
  const post = {
    titleEn: trimmed(input.titleEn, LIMITS.title),
    titleAr: trimmed(input.titleAr, LIMITS.title),
    excerptEn: trimmed(input.excerptEn, LIMITS.excerpt),
    excerptAr: trimmed(input.excerptAr, LIMITS.excerpt),
    bodyEn: trimmed(input.bodyEn, LIMITS.body),
    bodyAr: trimmed(input.bodyAr, LIMITS.body),
    category: input.category,
    readMinutes: 0,
    publishedOn: trimmed(input.publishedOn, 10),
    status: input.status,
    featured: input.featured === true,
    coverAltEn: trimmed(input.coverAltEn, LIMITS.alt),
    coverAltAr: trimmed(input.coverAltAr, LIMITS.alt),
  };
  if (!post.titleEn || !post.titleAr || !post.excerptEn || !post.excerptAr || !post.bodyEn || !post.bodyAr) return null;
  if (!blogCategories.includes(post.category) || !publishStates.includes(post.status) || !isDay(post.publishedOn)) return null;
  if (!slugify(post.titleEn)) return null;
  const minutes = Number(input.readMinutes);
  post.readMinutes = Number.isInteger(minutes) && minutes >= 1 && minutes <= LIMITS.readMinutes ? minutes : estimateMinutes(post.bodyEn);
  return post;
}

function cleanDocument(input: SiteDocumentInput): SiteDocumentInput | null {
  const doc = {
    titleEn: trimmed(input.titleEn, LIMITS.title),
    titleAr: trimmed(input.titleAr, LIMITS.title),
    descEn: trimmed(input.descEn, LIMITS.docDesc),
    descAr: trimmed(input.descAr, LIMITS.docDesc),
    category: input.category,
    fileName: stripPdf(trimmed(input.fileName, LIMITS.fileName + 4)),
    status: input.status,
    order: Number.isInteger(Number(input.order)) ? Math.max(0, Math.min(999, Number(input.order))) : 0,
  };
  if (!doc.titleEn || !doc.titleAr || !doc.descEn || !doc.descAr) return null;
  if (!siteDocCategories.includes(doc.category) || !publishStates.includes(doc.status)) return null;
  if (fileNameProblem(doc.fileName)) return null;
  return doc;
}

/** A slug no other post uses: "my-title", then "my-title-2", "my-title-3"… */
async function uniqueSlug(title: string, ignoreId = "") {
  const base = slugify(title) || "post";
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await adminDb().collection(POSTS).where("slug", "==", candidate).limit(2).get();
    if (taken.docs.every((doc) => doc.id === ignoreId)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function fail(error: string): Fail {
  return { ok: false, error };
}

// ---------- Blog posts ----------

export async function createBlogPost(idToken: string, input: BlogPostInput): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const post = cleanPost(input);
    if (!post) return fail("us.invalid");
    const slug = await uniqueSlug(post.titleEn);
    const ref = await adminDb().collection(POSTS).add({
      ...post,
      slug,
      coverPath: "",
      coverType: "",
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("website.post.create", who.uid, ref.id, post.titleEn);
    updateTag(SITE_TAG);
    return { ok: true, id: ref.id };
  } catch {
    return fail("auth.failed");
  }
}

export async function updateBlogPost(idToken: string, postId: string, input: BlogPostInput): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const post = cleanPost(input);
    if (!post) return fail("us.invalid");
    const ref = adminDb().collection(POSTS).doc(postId);
    const snap = await ref.get();
    if (!snap.exists) return fail("us.invalid");
    // The slug stays stable once published so shared links keep working.
    const slug = typeof snap.data()?.slug === "string" && snap.data()?.slug ? snap.data()?.slug : await uniqueSlug(post.titleEn, postId);
    await ref.update({ ...post, slug, updatedAt: FieldValue.serverTimestamp() });
    await audit("website.post.update", who.uid, postId, post.titleEn);
    updateTag(SITE_TAG);
    return { ok: true, id: postId };
  } catch {
    return fail("auth.failed");
  }
}

export async function deleteBlogPost(idToken: string, postId: string): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const ref = adminDb().collection(POSTS).doc(postId);
    const snap = await ref.get();
    if (!snap.exists) return fail("us.invalid");
    const path = snap.data()?.coverPath;
    if (typeof path === "string" && path) await removePrivateFile(path);
    await ref.delete();
    await audit("website.post.delete", who.uid, postId, String(snap.data()?.titleEn ?? ""));
    updateTag(SITE_TAG);
    return { ok: true };
  } catch {
    return fail("auth.failed");
  }
}

export async function clearBlogCover(idToken: string, postId: string): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const ref = adminDb().collection(POSTS).doc(postId);
    const snap = await ref.get();
    if (!snap.exists) return fail("us.invalid");
    const path = snap.data()?.coverPath;
    if (typeof path === "string" && path) await removePrivateFile(path);
    await ref.update({ coverPath: "", coverType: "" });
    await audit("website.post.cover.delete", who.uid, postId, "");
    updateTag(SITE_TAG);
    return { ok: true };
  } catch {
    return fail("auth.failed");
  }
}

// ---------- Public documents ----------

export async function createSiteDocument(idToken: string, input: SiteDocumentInput): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const doc = cleanDocument(input);
    if (!doc) return fail("us.invalid");
    const ref = await adminDb().collection(DOCS).add({
      ...doc,
      storagePath: "",
      contentType: "",
      size: 0,
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("website.document.create", who.uid, ref.id, doc.titleEn);
    updateTag(SITE_TAG);
    return { ok: true, id: ref.id };
  } catch {
    return fail("auth.failed");
  }
}

export async function updateSiteDocument(idToken: string, documentId: string, input: SiteDocumentInput): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const doc = cleanDocument(input);
    if (!doc) return fail("us.invalid");
    const ref = adminDb().collection(DOCS).doc(documentId);
    if (!(await ref.get()).exists) return fail("us.invalid");
    await ref.update({ ...doc, updatedAt: FieldValue.serverTimestamp() });
    await audit("website.document.update", who.uid, documentId, doc.titleEn);
    updateTag(SITE_TAG);
    return { ok: true, id: documentId };
  } catch {
    return fail("auth.failed");
  }
}

export async function deleteSiteDocument(idToken: string, documentId: string): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const ref = adminDb().collection(DOCS).doc(documentId);
    const snap = await ref.get();
    if (!snap.exists) return fail("us.invalid");
    const path = snap.data()?.storagePath;
    if (typeof path === "string" && path) await removePrivateFile(path);
    await ref.delete();
    await audit("website.document.delete", who.uid, documentId, String(snap.data()?.titleEn ?? ""));
    updateTag(SITE_TAG);
    return { ok: true };
  } catch {
    return fail("auth.failed");
  }
}

export async function clearSiteDocumentFile(idToken: string, documentId: string): Promise<ActionResult> {
  try {
    const who = await gate(idToken, true);
    if ("error" in who) return fail(who.error);
    const ref = adminDb().collection(DOCS).doc(documentId);
    const snap = await ref.get();
    if (!snap.exists) return fail("us.invalid");
    const path = snap.data()?.storagePath;
    if (typeof path === "string" && path) await removePrivateFile(path);
    await ref.update({ storagePath: "", contentType: "", size: 0 });
    await audit("website.document.file.delete", who.uid, documentId, "");
    updateTag(SITE_TAG);
    return { ok: true };
  } catch {
    return fail("auth.failed");
  }
}

/** Short-lived link to a stored cover or PDF, for previews inside the system. */
export async function openWebsiteFile(
  idToken: string,
  kind: "cover" | "document",
  id: string,
): Promise<{ ok: true; url: string } | Fail> {
  try {
    const who = await gate(idToken, false);
    if ("error" in who) return fail(who.error);
    const snap = await adminDb().collection(kind === "cover" ? POSTS : DOCS).doc(id).get();
    const path = snap.data()?.[kind === "cover" ? "coverPath" : "storagePath"];
    if (!snap.exists || typeof path !== "string" || !path.startsWith("website/")) return fail("us.invalid");
    return { ok: true, url: await signedReadUrl(path) };
  } catch {
    return fail("auth.failed");
  }
}
