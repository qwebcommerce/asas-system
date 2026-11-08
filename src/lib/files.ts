export const imageBytes = 2 * 1024 * 1024;
export const pdfBytes = 5 * 1024 * 1024;

const limits = {
  "image/jpeg": imageBytes,
  "image/png": imageBytes,
  "image/webp": imageBytes,
  "application/pdf": pdfBytes,
} as const;

export type StoredType = keyof typeof limits;

export function resolveStoredType(type: string, name = ""): StoredType | null {
  if (type === "image/jpg") return "image/jpeg";
  if (type in limits) return type as StoredType;
  if (type && type !== "application/octet-stream" && type !== "binary/octet-stream") return null;
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "pdf") return "application/pdf";
  return null;
}

export function fileProblem(type: string, size: number, name = "") {
  const stored = resolveStoredType(type, name);
  if (!stored) return "hr.fileType" as const;
  if (!Number.isFinite(size) || size <= 0 || size > limits[stored]) return "hr.fileSize" as const;
  return null;
}

export function extensionFor(type: string) {
  if (type === "application/pdf") return "pdf";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
