import { randomUUID } from "crypto";
import { adminBucket } from "@/lib/firebase-admin";
import { extensionFor, fileProblem, resolveStoredType, type StoredType } from "@/lib/files";

export async function savePrivateFile(folder: string, type: StoredType, bytes: Buffer) {
  const path = `${folder}/${randomUUID()}.${extensionFor(type)}`;
  await adminBucket().file(path).save(bytes, {
    resumable: false,
    metadata: { contentType: type, cacheControl: "private, max-age=3600" },
  });
  return path;
}

export async function signedReadUrl(path: string, downloadName?: string) {
  const [url] = await adminBucket().file(path).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 10 * 60 * 1000,
    ...(downloadName
      ? { responseDisposition: `attachment; filename="${downloadName.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(downloadName)}` }
      : {}),
  });
  return url;
}

export async function removePrivateFile(path: string) {
  if (!path.startsWith("employees/") && !path.startsWith("hr-documents/") && !path.startsWith("project-reports/") && !path.startsWith("library/") && !path.startsWith("website/")) return;
  await adminBucket().file(path).delete({ ignoreNotFound: true });
}

export function acceptedFile(type: string, size: number, name = ""): StoredType | null {
  const stored = resolveStoredType(type, name);
  if (!stored || fileProblem(type, size, name)) return null;
  return stored;
}
