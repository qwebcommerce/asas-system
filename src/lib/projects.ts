/*
 * Projects: the company's jobs, managed in the system (Projects module) and optionally shown
 * on the public website. Bills, expenses, receipts, invoices, reports, offers and library
 * documents link to a project through `projectId`.
 *
 * Client details and budget are private: they are never sent to the public website.
 */
import { isOfferKind, type OfferKind } from "@/lib/offers";

export const projectStatuses = ["planning", "active", "onhold", "completed"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];

export const PROJECT_LIMITS = {
  name: 140,
  text: 160,
  description: 2000,
  summary: 320,
  budget: 1_000_000_000,
} as const;

export type Project = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  kind: OfferKind;
  status: ProjectStatus;
  // client (private)
  clientEn: string;
  clientAr: string;
  clientPhone: string;
  clientEmail: string;
  clientIdNo: string;
  clientAddressEn: string;
  clientAddressAr: string;
  // site and plan
  locationEn: string;
  locationAr: string;
  budget: number;
  startOn: string;
  endOn: string;
  notesEn: string;
  notesAr: string;
  // public website
  published: boolean;
  slug: string;
  summaryEn: string;
  summaryAr: string;
  hasCover: boolean;
  coverType: string;
  /** Whether each of the two gallery photos (shown under the cover on the website) is set */
  gallery: [boolean, boolean];
  createdBy: string;
};

export type ProjectInput = Omit<Project, "id" | "code" | "slug" | "hasCover" | "coverType" | "gallery" | "createdBy">;

/** Images of a project on the website: the cover and two gallery photos. Stored as `<slot>Path` / `<slot>Type`. */
export const projectImageSlots = ["cover", "photo1", "photo2"] as const;
export type ProjectImageSlot = (typeof projectImageSlots)[number];

export function isProjectImageSlot(value: unknown): value is ProjectImageSlot {
  return projectImageSlots.some((slot) => slot === value);
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function day(value: unknown) {
  const v = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
}

export function mapProject(id: string, data: Record<string, unknown>): Project | null {
  const nameEn = text(data.nameEn);
  if (!nameEn) return null;
  return {
    id,
    code: text(data.code),
    nameEn,
    nameAr: text(data.nameAr),
    kind: isOfferKind(data.kind) ? data.kind : "construction",
    status: projectStatuses.find((item) => item === data.status) ?? "planning",
    clientEn: text(data.clientEn),
    clientAr: text(data.clientAr),
    clientPhone: text(data.clientPhone),
    clientEmail: text(data.clientEmail),
    clientIdNo: text(data.clientIdNo),
    clientAddressEn: text(data.clientAddressEn),
    clientAddressAr: text(data.clientAddressAr),
    locationEn: text(data.locationEn),
    locationAr: text(data.locationAr),
    budget: typeof data.budget === "number" && Number.isInteger(data.budget) && data.budget >= 0 ? data.budget : 0,
    startOn: day(data.startOn),
    endOn: day(data.endOn),
    notesEn: text(data.notesEn),
    notesAr: text(data.notesAr),
    published: data.published === true,
    slug: text(data.slug),
    summaryEn: text(data.summaryEn),
    summaryAr: text(data.summaryAr),
    hasCover: text(data.coverPath).length > 0,
    coverType: text(data.coverType),
    gallery: [text(data.photo1Path).length > 0, text(data.photo2Path).length > 0],
    createdBy: text(data.createdBy),
  };
}

/** Field-level problems (message keys) for the project form; the server applies the same checks. */
export function projectProblems(input: ProjectInput): Record<string, string> {
  const problems: Record<string, string> = {};
  const required = ["nameEn", "nameAr", "clientEn", "clientAr"] as const;
  for (const key of required) if (!input[key].trim()) problems[key] = "prj.required";
  if (input.nameEn.trim() && !/[a-z0-9]/i.test(input.nameEn)) problems.nameEn = "prj.nameLatin";
  if (!isOfferKind(input.kind)) problems.kind = "prj.required";
  if (!projectStatuses.includes(input.status)) problems.status = "prj.required";
  if (input.clientPhone && !/^[0-9+\s()-]{6,20}$/.test(input.clientPhone)) problems.clientPhone = "prj.badPhone";
  if (input.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.clientEmail)) problems.clientEmail = "prj.badEmail";
  if (input.clientIdNo && !/^[0-9]{5,20}$/.test(input.clientIdNo)) problems.clientIdNo = "prj.badId";
  if (!Number.isInteger(input.budget) || input.budget < 0 || input.budget > PROJECT_LIMITS.budget) problems.budget = "prj.badBudget";
  if (input.startOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.startOn)) problems.startOn = "prj.badDate";
  if (input.endOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.endOn)) problems.endOn = "prj.badDate";
  if (input.startOn && input.endOn && input.endOn < input.startOn) problems.endOn = "prj.endBeforeStart";
  if (input.published && (!input.summaryEn.trim() || !input.summaryAr.trim())) {
    if (!input.summaryEn.trim()) problems.summaryEn = "prj.summaryRequired";
    if (!input.summaryAr.trim()) problems.summaryAr = "prj.summaryRequired";
  }
  return problems;
}

export function projectName(project: { nameEn: string; nameAr: string }, locale: string) {
  return locale === "ar" ? project.nameAr || project.nameEn : project.nameEn || project.nameAr;
}

/** A record's project label: its linked project's name, else the names stored on the record. */
export function linkedProjectName(
  record: { projectId?: string; projectEn?: string; projectAr?: string },
  projects: Project[],
  locale: string,
) {
  const project = record.projectId ? projects.find((item) => item.id === record.projectId) : undefined;
  if (project) return projectName(project, locale);
  return locale === "ar" ? record.projectAr || record.projectEn || "" : record.projectEn || record.projectAr || "";
}
