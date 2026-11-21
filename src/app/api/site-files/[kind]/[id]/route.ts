import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { stripPdf } from "@/lib/website";
import { signedReadUrl } from "@/server/blobs";

/*
 * Public files of the website:
 *   /api/site-files/cover/<postId>       cover image of a published blog post
 *   /api/site-files/document/<docId>     PDF of a published document (downloads with its file name)
 *   /api/site-files/project/<projectId>  cover image of a project shown on the website
 *   /api/site-files/project/<projectId>?photo=1|2  one of the project's two gallery photos
 * Files stay private in Storage; visitors get a short-lived signed link.
 */

export async function GET(request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if ((kind !== "cover" && kind !== "document" && kind !== "project") || !/^[A-Za-z0-9]{1,64}$/.test(id) || !isAdminConfigured()) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const collection = kind === "cover" ? "blogPosts" : kind === "project" ? "projects" : "siteDocuments";
    const snap = await adminDb().collection(collection).doc(id).get();
    const data = snap.data();
    const photo = kind === "project" ? new URL(request.url).searchParams.get("photo") : null;
    if (photo !== null && photo !== "1" && photo !== "2") return new Response("Not found", { status: 404 });
    const field = kind === "document" ? "storagePath" : photo ? `photo${photo}Path` : "coverPath";
    const path = data?.[field];
    const isPublic = kind === "project" ? data?.published === true : data?.status === "published";
    if (!snap.exists || !isPublic || typeof path !== "string" || !path.startsWith("website/")) {
      return new Response("Not found", { status: 404 });
    }
    const name = kind === "document" ? `${stripPdf(String(data?.fileName || "document"))}.pdf` : undefined;
    const url = await signedReadUrl(path, name);
    return new Response(null, {
      status: 302,
      headers: { Location: url, "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
