"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useAccounting } from "@/components/use-accounting";
import { useProjects } from "@/components/use-projects";
import { Modal, Toast } from "@/components/ui/overlay";
import { Link, useRouter } from "@/i18n/navigation";
import { fileProblem, resolveStoredType } from "@/lib/files";
import { offerKinds } from "@/lib/offers";
import { PROJECT_LIMITS, projectImageSlots, projectName, projectProblems, projectStatuses, type Project, type ProjectImageSlot, type ProjectInput, type ProjectStatus } from "@/lib/projects";
import { clearProjectImage, createProject, openProjectImage, updateProject } from "@/server/projects";

type GetToken = () => Promise<string>;

export function statusTone(status: ProjectStatus) {
  if (status === "active") return "ok";
  if (status === "onhold") return "warn";
  if (status === "completed") return "neutral";
  return "info";
}

export function formatQar(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "QAR", numberingSystem: "latn", maximumFractionDigits: 0 }).format(amount);
}

/** Spent on a project = its bills + expenses; received = its receipts. */
export function projectMoney(projectId: string, data: ReturnType<typeof useAccounting>) {
  const spent = data.bills.filter((b) => b.projectId === projectId).reduce((sum, b) => sum + b.amount, 0)
    + data.expenses.filter((e) => e.projectId === projectId).reduce((sum, e) => sum + e.amount, 0);
  const received = data.receipts.filter((r) => r.projectId === projectId).reduce((sum, r) => sum + r.amount, 0);
  return { spent, received };
}

export function ProjectsScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { getToken } = useAuth();
  const { projects, ready, canView, canManage } = useProjects();
  const accounting = useAccounting();
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [toast, setToast] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (status !== "all" && project.status !== status) return false;
      if (!needle) return true;
      return [project.code, project.nameEn, project.nameAr, project.clientEn, project.clientAr, project.locationEn, project.locationAr].some((v) => v.toLowerCase().includes(needle));
    });
  }, [projects, query, status]);

  if (ready && !canView) {
    return <AppShell title={t("nav.projects")}><p className="muted">{t("common.forbidden")}</p></AppShell>;
  }

  return (
    <AppShell title={t("nav.projects")}>
      <div className="prj stack">
        <div className="page-header">
          <div>
            <span className="eyebrow">{t("prj.eyebrow")}</span>
            <h2 className="page-title">{t("nav.projects")}</h2>
            <p className="page-sub">{ready ? t("prj.count", { count: projects.length }) : t("common.loading")}</p>
          </div>
          {canManage ? (
            <div className="hstack page-actions">
              <button type="button" className="btn btn--primary" onClick={() => setEditing("new")}>
                <Icon name="plus" />
                {t("prj.new")}
              </button>
            </div>
          ) : null}
        </div>

        <div className="hstack prj-filters">
          <label className="search">
            <Icon name="search" className="icon icon--sm" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("prj.search")} />
          </label>
          <select className="select" style={{ width: "auto" }} value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | "all")} aria-label={t("col.status")}>
            <option value="all">{t("prj.allStatuses")}</option>
            {projectStatuses.map((item) => <option key={item} value={item}>{t(`prj.status.${item}`)}</option>)}
          </select>
        </div>

        <div className="card card--flush table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th>{t("prj.project")}</th>
                <th>{t("prj.client")}</th>
                <th>{t("prj.type")}</th>
                <th>{t("col.status")}</th>
                <th className="end">{t("prj.budget")}</th>
                {accounting.canView ? <th className="end">{t("prj.spent")}</th> : null}
                <th />
              </tr>
            </thead>
            <tbody>
              {!ready ? <tr><td colSpan={7}>{t("common.loading")}</td></tr> : null}
              {ready && visible.length === 0 ? <tr><td colSpan={7}>{projects.length ? t("prj.noMatch") : t("prj.empty")}</td></tr> : null}
              {visible.map((project) => {
                const money = projectMoney(project.id, accounting);
                const over = project.budget > 0 && money.spent > project.budget;
                return (
                  <tr key={project.id} className="prj-row" onClick={() => router.push(`/projects/${project.id}`)}>
                    <td data-label={t("prj.project")}>
                      <Link href={`/projects/${project.id}`} onClick={(event) => event.stopPropagation()}><b>{projectName(project, locale)}</b></Link>
                      <small className="muted" style={{ display: "block" }}><bdi>{project.code}</bdi> · {locale === "ar" ? project.nameEn : project.nameAr}</small>
                    </td>
                    <td data-label={t("prj.client")}>{locale === "ar" ? project.clientAr || project.clientEn : project.clientEn || project.clientAr}</td>
                    <td data-label={t("prj.type")}><span className="badge badge--accent badge--plain">{t(`off.${project.kind}`)}</span></td>
                    <td data-label={t("col.status")}>
                      <span className="hstack" style={{ gap: 6, flexWrap: "wrap" }}>
                        <span className={`badge badge--${statusTone(project.status)}`}>{t(`prj.status.${project.status}`)}</span>
                        {project.published ? <span className="badge badge--info badge--plain">{t("prj.onWebsite")}</span> : null}
                      </span>
                    </td>
                    <td data-label={t("prj.budget")} className="num end"><bdi>{project.budget ? formatQar(project.budget, locale) : "—"}</bdi></td>
                    {accounting.canView ? (
                      <td data-label={t("prj.spent")} className={`num end${over ? " prj-over" : ""}`}><bdi>{formatQar(money.spent, locale)}</bdi></td>
                    ) : null}
                    <td className="end" data-label="">
                      {canManage ? (
                        <button type="button" className="btn btn--secondary btn--sm" onClick={(event) => { event.stopPropagation(); setEditing(project); }}>{t("us.edit")}</button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ProjectModal
          project={editing}
          onClose={() => setEditing(null)}
          onSaved={(title, id, created) => {
            setEditing(null);
            setToast(title);
            window.setTimeout(() => setToast(""), 3000);
            if (created && id) router.push(`/projects/${id}`);
          }}
          getToken={getToken}
        />
        <Toast open={Boolean(toast)} title={t("prj.saved")} detail={toast} />
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------- form

const emptyProject = (): ProjectInput => ({
  nameEn: "",
  nameAr: "",
  kind: "architecture",
  status: "planning",
  clientEn: "",
  clientAr: "",
  clientPhone: "",
  clientEmail: "",
  clientIdNo: "",
  clientAddressEn: "",
  clientAddressAr: "",
  locationEn: "",
  locationAr: "",
  budget: 0,
  startOn: "",
  endOn: "",
  notesEn: "",
  notesAr: "",
  published: false,
  summaryEn: "",
  summaryAr: "",
});

function toInput(project: Project): ProjectInput {
  const input = emptyProject();
  for (const key of Object.keys(input) as (keyof ProjectInput)[]) (input as Record<string, unknown>)[key] = project[key];
  return input;
}

export function ProjectModal({
  project,
  onClose,
  onSaved,
  getToken,
}: {
  project: Project | "new" | null;
  onClose: () => void;
  onSaved: (title: string, id: string, created: boolean) => void;
  getToken: GetToken;
}) {
  const t = useTranslations();
  const existing = project && project !== "new" ? project : null;
  return (
    <Modal open={project !== null} wide title={existing ? t("prj.edit") : t("prj.new")} onClose={onClose}>
      {project ? <ProjectForm key={existing?.id ?? "new"} existing={existing} onClose={onClose} onSaved={onSaved} getToken={getToken} /> : null}
    </Modal>
  );
}

async function looksLikeImage(file: File) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (a: number, b: number) => String.fromCharCode(...head.slice(a, b));
  return (head[0] === 0x89 && ascii(1, 4) === "PNG") || (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) || (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP");
}

function ProjectForm({
  existing,
  onClose,
  onSaved,
  getToken,
}: {
  existing: Project | null;
  onClose: () => void;
  onSaved: (title: string, id: string, created: boolean) => void;
  getToken: GetToken;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [form, setForm] = useState<ProjectInput>(() => (existing ? toInput(existing) : emptyProject()));
  const [budget, setBudget] = useState(existing?.budget ? String(existing.budget) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState("");
  // Website images (cover + two gallery photos): a newly chosen file, or "remove the stored one"
  const [picked, setPicked] = useState<Record<ProjectImageSlot, File | null>>({ cover: null, photo1: null, photo2: null });
  const [dropped, setDropped] = useState<Record<ProjectImageSlot, boolean>>({ cover: false, photo1: false, photo2: false });
  const [stored, setStored] = useState<Record<ProjectImageSlot, string>>({ cover: "", photo1: "", photo2: "" });
  const hasStored = (slot: ProjectImageSlot) => (slot === "cover" ? Boolean(existing?.hasCover) : Boolean(existing?.gallery[slot === "photo1" ? 0 : 1]));
  const keeps = (slot: ProjectImageSlot) => hasStored(slot) && !dropped[slot];
  useEffect(() => {
    if (!existing) return;
    let active = true;
    void (async () => {
      for (const slot of projectImageSlots) {
        if (!(slot === "cover" ? existing.hasCover : existing.gallery[slot === "photo1" ? 0 : 1])) continue;
        const result = await openProjectImage(await getToken(), existing.id, slot);
        if (active && result.ok) setStored((current) => ({ ...current, [slot]: result.url }));
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  function set<K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function chooseImage(slot: ProjectImageSlot, file: File | null) {
    if (!file) return;
    const type = resolveStoredType(file.type, file.name);
    if (!type || !type.startsWith("image/") || !(await looksLikeImage(file))) return setErrors((c) => ({ ...c, [slot]: "web.imageOnly" }));
    if (fileProblem(file.type, file.size, file.name)) return setErrors((c) => ({ ...c, [slot]: "web.imageSize" }));
    setPicked((current) => ({ ...current, [slot]: file }));
    setDropped((current) => ({ ...current, [slot]: false }));
    setErrors((c) => ({ ...c, [slot]: "" }));
  }

  async function save() {
    if (saving) return;
    const amount = budget.trim() === "" ? 0 : Number(budget);
    const input: ProjectInput = { ...form, budget: amount };
    const problems = projectProblems(input);
    if (budget.trim() !== "" && (!Number.isInteger(amount) || amount < 0)) problems.budget = "prj.badBudget";
    if (input.published && !picked.cover && !keeps("cover")) problems.cover = "prj.coverRequired";
    setErrors(problems);
    if (Object.values(problems).some(Boolean)) return;
    setSaving(true);
    setFailure("");
    try {
      const token = await getToken();
      const id = existing?.id || savedId;
      const result = id ? await updateProject(token, id, input) : await createProject(token, input);
      if (!result.ok || !result.id) {
        setFailure(t(result.ok ? "auth.failed" : result.error));
        return;
      }
      setSavedId(result.id);
      // Images upload only now, after the project is saved
      for (const slot of projectImageSlots) {
        const file = picked[slot];
        if (dropped[slot] && !file) await clearProjectImage(await getToken(), result.id, slot);
        if (!file) continue;
        const body = new FormData();
        body.set("token", await getToken());
        body.set("purpose", "project");
        body.set("slot", slot);
        body.set("id", result.id);
        body.set("file", file);
        const response = await fetch("/api/website/files", { method: "POST", body });
        const payload = (await response.json()) as { ok: boolean; error?: string };
        if (!payload.ok) {
          setErrors((c) => ({ ...c, [slot]: payload.error ?? "auth.failed" }));
          return;
        }
        setPicked((current) => ({ ...current, [slot]: null }));
      }
      onSaved(locale === "ar" ? input.nameAr || input.nameEn : input.nameEn || input.nameAr, result.id, !existing);
    } catch {
      setFailure(t("web.requestFailed"));
    } finally {
      setSaving(false);
    }
  }

  const imageField = (slot: ProjectImageSlot, label: string, hint: string) => (
    <ImageField
      label={label}
      hint={hint}
      file={picked[slot]}
      keeps={keeps(slot)}
      storedUrl={stored[slot]}
      error={errors[slot] ? t(errors[slot]) : ""}
      onChoose={(file) => void chooseImage(slot, file)}
      onRemoveNew={() => setPicked((current) => ({ ...current, [slot]: null }))}
      onRemoveStored={() => setDropped((current) => ({ ...current, [slot]: true }))}
    />
  );

  return (
    <form className="stack" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <h4 className="prj-form__section">{t("prj.sectionProject")}</h4>
      <div className="form-grid form-grid--2">
        <Text label={t("prj.name")} lang="en" value={form.nameEn} max={PROJECT_LIMITS.name} error={errors.nameEn} onChange={(v) => set("nameEn", v)} />
        <Text label={t("prj.name")} lang="ar" value={form.nameAr} max={PROJECT_LIMITS.name} error={errors.nameAr} onChange={(v) => set("nameAr", v)} />
        <div className="field">
          <label htmlFor="prj-kind">{t("prj.type")}</label>
          <select id="prj-kind" className="select" value={form.kind} onChange={(e) => set("kind", e.target.value as ProjectInput["kind"])}>
            {offerKinds.map((kind) => <option key={kind} value={kind}>{t(`off.${kind}`)}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="prj-status">{t("col.status")}</label>
          <select id="prj-status" className="select" value={form.status} onChange={(e) => set("status", e.target.value as ProjectStatus)}>
            {projectStatuses.map((status) => <option key={status} value={status}>{t(`prj.status.${status}`)}</option>)}
          </select>
        </div>
        <Text label={t("prj.location")} lang="en" value={form.locationEn} max={PROJECT_LIMITS.text} onChange={(v) => set("locationEn", v)} />
        <Text label={t("prj.location")} lang="ar" value={form.locationAr} max={PROJECT_LIMITS.text} onChange={(v) => set("locationAr", v)} />
        <div className={`field${errors.budget ? " field--invalid" : ""}`}>
          <label htmlFor="prj-budget">{t("prj.budgetQar")}</label>
          <input id="prj-budget" className="input num" type="number" min={0} step={1} value={budget} onChange={(e) => { setBudget(e.target.value); setErrors((c) => ({ ...c, budget: "" })); }} />
          {errors.budget ? <span className="field-error">{t(errors.budget)}</span> : null}
        </div>
        <div className="form-grid form-grid--2" style={{ gap: 12 }}>
          <DateInput label={t("prj.startOn")} value={form.startOn} error={errors.startOn} onChange={(v) => set("startOn", v)} />
          <DateInput label={t("prj.endOn")} value={form.endOn} error={errors.endOn} onChange={(v) => set("endOn", v)} />
        </div>
      </div>

      <h4 className="prj-form__section">{t("prj.sectionClient")}</h4>
      <div className="form-grid form-grid--2">
        <Text label={t("prj.clientName")} lang="en" value={form.clientEn} max={PROJECT_LIMITS.text} error={errors.clientEn} onChange={(v) => set("clientEn", v)} />
        <Text label={t("prj.clientName")} lang="ar" value={form.clientAr} max={PROJECT_LIMITS.text} error={errors.clientAr} onChange={(v) => set("clientAr", v)} />
        <Text label={t("prj.phone")} value={form.clientPhone} max={20} error={errors.clientPhone} onChange={(v) => set("clientPhone", v)} ltr />
        <Text label={t("prj.email")} value={form.clientEmail} max={120} error={errors.clientEmail} onChange={(v) => set("clientEmail", v)} ltr />
        <Text label={t("prj.idNo")} value={form.clientIdNo} max={20} error={errors.clientIdNo} onChange={(v) => set("clientIdNo", v)} ltr />
        <span />
        <Text label={t("prj.address")} lang="en" value={form.clientAddressEn} max={PROJECT_LIMITS.text} onChange={(v) => set("clientAddressEn", v)} />
        <Text label={t("prj.address")} lang="ar" value={form.clientAddressAr} max={PROJECT_LIMITS.text} onChange={(v) => set("clientAddressAr", v)} />
      </div>

      <h4 className="prj-form__section">{t("prj.sectionNotes")}</h4>
      <div className="form-grid form-grid--2">
        <Text label={t("prj.notes")} lang="en" multiline value={form.notesEn} max={PROJECT_LIMITS.description} onChange={(v) => set("notesEn", v)} />
        <Text label={t("prj.notes")} lang="ar" multiline value={form.notesAr} max={PROJECT_LIMITS.description} onChange={(v) => set("notesAr", v)} />
      </div>

      <h4 className="prj-form__section">{t("prj.sectionWebsite")}</h4>
      <label className="check">
        <input type="checkbox" checked={form.published} onChange={(e) => set("published", e.target.checked)} />
        <span>{t("prj.publish")}</span>
      </label>
      <p className="web-hint">{t("prj.publishHint")}</p>
      {form.published ? (
        <>
          <div className="form-grid form-grid--2">
            <Text label={t("prj.summary")} lang="en" multiline value={form.summaryEn} max={PROJECT_LIMITS.summary} error={errors.summaryEn} onChange={(v) => set("summaryEn", v)} />
            <Text label={t("prj.summary")} lang="ar" multiline value={form.summaryAr} max={PROJECT_LIMITS.summary} error={errors.summaryAr} onChange={(v) => set("summaryAr", v)} />
          </div>
          {imageField("cover", t("prj.cover"), t("web.coverHint"))}
          <div className="form-grid form-grid--2">
            {imageField("photo1", t("prj.photo", { n: 1 }), t("prj.galleryHint"))}
            {imageField("photo2", t("prj.photo", { n: 2 }), t("prj.galleryHint"))}
          </div>
        </>
      ) : null}

      {failure ? <p style={{ color: "var(--danger)" }}>{failure}</p> : null}
      <div className="hstack" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn--ghost" onClick={onClose}>{t("btn.cancel")}</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? t("web.saving") : t("set.save")}</button>
      </div>
    </form>
  );
}

/** One website image of the project: a local preview before saving, the stored image, or a picker. */
function ImageField({
  label,
  hint,
  file,
  keeps,
  storedUrl,
  error,
  onChoose,
  onRemoveNew,
  onRemoveStored,
}: {
  label: string;
  hint: string;
  file: File | null;
  keeps: boolean;
  storedUrl: string;
  error: string;
  onChoose: (file: File | null) => void;
  onRemoveNew: () => void;
  onRemoveStored: () => void;
}) {
  const t = useTranslations();
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  return (
    <div className={`field${error ? " field--invalid" : ""}`}>
      <label>{label}</label>
      {file ? (
        <div className="file-chip">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
          <img className="file-chip__thumb" src={preview} alt="" />
          <div className="grow"><b>{file.name}</b></div>
          <button type="button" className="icon-btn file-chip__remove" aria-label={t("hr.fileRemove")} onClick={onRemoveNew}><Icon name="x" className="icon icon--sm" /></button>
        </div>
      ) : keeps ? (
        <div className="file-chip">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed preview */}
          {storedUrl ? <img className="file-chip__thumb" src={storedUrl} alt="" /> : <span className="file-chip__thumb file-chip__thumb--icon"><Icon name="camera" /></span>}
          <div className="grow"><b>{t("prj.currentImage")}</b></div>
          <button type="button" className="icon-btn file-chip__remove" aria-label={t("hr.fileRemove")} onClick={onRemoveStored}><Icon name="x" className="icon icon--sm" /></button>
        </div>
      ) : (
        <label className="file-pick">
          <span className="btn btn--secondary btn--sm">{t("hr.fileChoose")}</span>
          <span className="file-pick__name">{t("hr.fileNone")}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(e) => { const f = e.target.files?.[0] ?? null; e.currentTarget.value = ""; onChoose(f); }} />
        </label>
      )}
      <small className="muted">{hint}</small>
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}

function Text({
  label,
  lang,
  value,
  max,
  error,
  multiline = false,
  ltr = false,
  onChange,
}: {
  label: string;
  lang?: "en" | "ar";
  value: string;
  max: number;
  error?: string;
  multiline?: boolean;
  ltr?: boolean;
  onChange: (value: string) => void;
}) {
  const t = useTranslations();
  const id = `prj-${label}-${lang ?? "x"}`.replace(/\W+/g, "-");
  const dir = lang === "ar" ? "rtl" : lang === "en" || ltr ? "ltr" : undefined;
  return (
    <div className={`field${error ? " field--invalid" : ""}`}>
      <label htmlFor={id} className={lang ? "web-lang" : undefined}>
        {label} {lang ? <i>{lang === "ar" ? "عربي" : "EN"}</i> : null}
      </label>
      {multiline ? (
        <textarea id={id} className="textarea" lang={lang} dir={dir} rows={3} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="input" lang={lang} dir={dir} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {error ? <span className="field-error">{t(error)}</span> : null}
    </div>
  );
}

function DateInput({ label, value, error, onChange }: { label: string; value: string; error?: string; onChange: (value: string) => void }) {
  const t = useTranslations();
  return (
    <div className={`field${error ? " field--invalid" : ""}`}>
      <label>{label}</label>
      <input className="input" type="date" value={value} onChange={(e) => onChange(e.target.value)} />
      {error ? <span className="field-error">{t(error)}</span> : null}
    </div>
  );
}
