import { adminDb } from "@/lib/firebase-admin";

/*
 * Server helper for records that belong to a project (reports, bills, expenses, receipts,
 * invoices, offers, library documents). A record stores `projectId` plus the project's names,
 * which are always copied from the project itself so they cannot drift.
 */

export type ProjectLink = { projectId: string; projectEn: string; projectAr: string };

/**
 * Resolves a project id to the names stored on linked records.
 * Returns null when the id is set but no such project exists.
 * With an empty id, keeps the given fallback names (records not tied to a project).
 */
export async function projectLink(projectId: string, fallback: { projectEn: string; projectAr: string } = { projectEn: "", projectAr: "" }): Promise<ProjectLink | null> {
  const id = typeof projectId === "string" ? projectId.trim() : "";
  if (!id) return { projectId: "", projectEn: fallback.projectEn, projectAr: fallback.projectAr };
  if (!/^[A-Za-z0-9]{1,64}$/.test(id)) return null;
  const snap = await adminDb().collection("projects").doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  return {
    projectId: id,
    projectEn: typeof data.nameEn === "string" ? data.nameEn : "",
    projectAr: typeof data.nameAr === "string" ? data.nameAr : "",
  };
}

/** Collections whose records point at a project; a project in use cannot be deleted. */
export const projectLinkedCollections = ["projectReports", "bills", "expenses", "receipts", "invoices", "offers", "libraryDocuments"] as const;

export async function projectInUse(projectId: string) {
  for (const name of projectLinkedCollections) {
    const snap = await adminDb().collection(name).where("projectId", "==", projectId).limit(1).get();
    if (!snap.empty) return true;
  }
  return false;
}
