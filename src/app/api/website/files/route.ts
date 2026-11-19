import { revalidateTag } from "next/cache";
import { canWriteModule } from "@/lib/access";
import { fileProblem, resolveStoredType } from "@/lib/files";
import { adminDb } from "@/lib/firebase-admin";
import { sitePdfProblem } from "@/lib/website";
import { removePrivateFile, savePrivateFile } from "@/server/blobs";
import { actor, audit } from "@/server/session";

/*
 * Uploads for the Website module: a blog post's cover image or a public document's PDF.
 * Form fields: token, purpose ("cover" | "document"), id, file.
 */

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

/** Check the file really is what its type says (first bytes), not just its name. */
function signatureMatches(type: string, bytes: Buffer) {
  if (type === "application/pdf") return bytes.subarray(0, 5).toString("latin1") === "%PDF-";
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp") return bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP";
  return false;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const who = await actor(text(form.get("token")));
    if ("error" in who) return Response.json({ ok: false, error: who.error });
    if (!canWriteModule(who.level("website"))) return Response.json({ ok: false, error: "web.forbidden" });

    const purpose = text(form.get("purpose"));
    const id = text(form.get("id"));
    const file = form.get("file");
    if ((purpose !== "cover" && purpose !== "document") || !id || !(file instanceof File)) {
      return Response.json({ ok: false, error: "us.invalid" });
    }

    let type;
    if (purpose === "cover") {
      const stored = resolveStoredType(file.type, file.name);
      if (!stored || !stored.startsWith("image/")) return Response.json({ ok: false, error: "web.imageOnly" });
      if (fileProblem(file.type, file.size, file.name)) return Response.json({ ok: false, error: "web.imageSize" });
      type = stored;
    } else {
      const problem = sitePdfProblem(file.type, file.size, file.name);
      if (problem) return Response.json({ ok: false, error: problem });
      type = "application/pdf" as const;
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!signatureMatches(type, bytes)) {
      return Response.json({ ok: false, error: purpose === "cover" ? "web.imageOnly" : "web.pdfOnly" });
    }

    const ref = adminDb().collection(purpose === "cover" ? "blogPosts" : "siteDocuments").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ ok: false, error: "us.invalid" });

    const field = purpose === "cover" ? "coverPath" : "storagePath";
    const previous = typeof snap.data()?.[field] === "string" ? (snap.data()?.[field] as string) : "";
    const path = await savePrivateFile(`website/${purpose === "cover" ? "covers" : "documents"}/${id}`, type, bytes);
    await ref.update(
      purpose === "cover"
        ? { coverPath: path, coverType: type }
        : { storagePath: path, contentType: type, size: file.size },
    );
    if (previous) await removePrivateFile(previous);
    await audit(`website.${purpose}.upload`, who.uid, id, type);
    revalidateTag("website", "max");
    return Response.json({ ok: true, id });
  } catch {
    return Response.json({ ok: false, error: "auth.failed" });
  }
}
