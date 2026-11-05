export const imageBytes = 2 * 1024 * 1024;
export const pdfBytes = 5 * 1024 * 1024;

const limits = {
  "image/jpeg": imageBytes,
  "image/png": imageBytes,
  "image/webp": imageBytes,
  "application/pdf": pdfBytes,
} as const;

export type StoredType = keyof typeof limits;

export function fileProblem(type: string, size: number) {
  const limit = limits[type as StoredType];
  if (!limit) return "hr.fileType" as const;
  if (!Number.isFinite(size) || size <= 0 || size > limit) return "hr.fileSize" as const;
  return null;
}

export function extensionFor(type: string) {
  if (type === "application/pdf") return "pdf";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
