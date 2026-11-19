import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { stripPdf } from "@/lib/website";
import { signedReadUrl } from "@/server/blobs";

/*
 * Public files of the website:
 *   /api/site-files/cover/<postId>       cover image of a published blog post
 *   /api/site-files/document/<docId>     PDF of a published document (downloads with its file name)
 * Files stay private in Storage; visitors get a short-lived signed link.
 */

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if ((kind !== "cover" && kind !== "document") || !/^[A-Za-z0-9]{1,64}$/.test(id) || !isAdminConfigured()) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const snap = await adminDb().collection(kind === "cover" ? "blogPosts" : "siteDocuments").doc(id).get();
    const data = snap.data();
    const path = data?.[kind === "cover" ? "coverPath" : "storagePath"];
    if (!snap.exists || data?.status !== "published" || typeof path !== "string" || !path.startsWith("website/")) {
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
