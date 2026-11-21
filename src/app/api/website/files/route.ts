import { revalidateTag } from "next/cache";
import { canWriteModule } from "@/lib/access";
import { fileProblem, resolveStoredType } from "@/lib/files";
import { adminDb } from "@/lib/firebase-admin";
import { isProjectImageSlot } from "@/lib/projects";
import { removePrivateFile, savePrivateFile } from "@/server/blobs";
import { actor, audit } from "@/server/session";

/*
 * Image upload for a blog post cover (Website module) or a project's website images (Projects module).
 * Form fields: token, purpose ("cover" | "project"), id, file, and for projects `slot`
 * ("cover", "photo1" or "photo2"; defaults to the cover).
 * Document PDFs (up to 10 MB) do not come through here: the browser uploads them straight to
 * Storage and the document server actions attach them (see attachStagedPdf in src/server/website.ts).
 */

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

/** Check the file really is what its type says (first bytes), not just its name. */
function signatureMatches(type: string, bytes: Buffer) {
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
    const purpose = text(form.get("purpose"));
    // "cover": blog post cover (Website permission); "project": project cover (Projects permission)
    const area = purpose === "project" ? "projects" : "website";
    if (!canWriteModule(who.level(area))) return Response.json({ ok: false, error: area === "projects" ? "prj.forbidden" : "web.forbidden" });

    const id = text(form.get("id"));
    const file = form.get("file");
    if ((purpose !== "cover" && purpose !== "project") || !id || !(file instanceof File)) {
      return Response.json({ ok: false, error: "us.invalid" });
    }

    const type = resolveStoredType(file.type, file.name);
    if (!type || !type.startsWith("image/")) return Response.json({ ok: false, error: "web.imageOnly" });
    if (fileProblem(file.type, file.size, file.name)) return Response.json({ ok: false, error: "web.imageSize" });

    const bytes = Buffer.from(await file.arrayBuffer());
    if (!signatureMatches(type, bytes)) return Response.json({ ok: false, error: "web.imageOnly" });

    const ref = adminDb().collection(purpose === "project" ? "projects" : "blogPosts").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ ok: false, error: "us.invalid" });

    const slot = purpose === "project" ? text(form.get("slot")) || "cover" : "cover";
    if (!isProjectImageSlot(slot)) return Response.json({ ok: false, error: "us.invalid" });
    const previous = typeof snap.data()?.[`${slot}Path`] === "string" ? (snap.data()?.[`${slot}Path`] as string) : "";
    const path = await savePrivateFile(`website/${purpose === "project" ? "projects" : "covers"}/${id}`, type, bytes);
    await ref.update({ [`${slot}Path`]: path, [`${slot}Type`]: type });
    if (previous) await removePrivateFile(previous);
    await audit(`website.${purpose}.upload`, who.uid, id, slot === "cover" ? type : `${slot} ${type}`);
    // Expire immediately so the next visit shows the new cover (and a project published with it)
    revalidateTag("website", { expire: 0 });
    return Response.json({ ok: true, id });
  } catch {
    return Response.json({ ok: false, error: "auth.failed" });
  }
}
