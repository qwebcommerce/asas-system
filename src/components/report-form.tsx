"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ProjectSelect } from "@/components/project-select";
import { Icon } from "@/components/icon";
import { useOffers } from "@/components/use-offers";
import { useReports } from "@/components/use-reports";
import { Link, useRouter } from "@/i18n/navigation";
import { fileProblem } from "@/lib/files";
import { qatarToday } from "@/lib/hr";
import { latestReport, mergeWorkItems, offerWorkItems, projectTitle, reportServices, workStatuses, type ProjectReport, type ReportFile, type ReportInput, type ReportService, type WorkItem, type WorkStatus } from "@/lib/reports";
import { createProjectReport, deleteReportFile, openReportFile, updateProjectReport } from "@/server/reports";

type DraftItem = WorkItem & { key: string };

export function ReportForm({ reportId }: { reportId?: string }) {
  const t = useTranslations();
  const { reports, ready, canManage, canView } = useReports();
  const report = reportId ? reports.find((item) => item.id === reportId) : undefined;

  if (!canView && ready) {
    return (
      <AppShell title={t("rep.title")}>
        <p className="muted">{t("rep.forbidden")}</p>
      </AppShell>
    );
  }
  if (reportId && !ready) {
    return (
      <AppShell title={t("rep.title")}>
        <p className="muted">{t("common.loading")}</p>
      </AppShell>
    );
  }
  if (reportId && !report) {
    return (
      <AppShell title={t("rep.title")}>
        <Link href="/reports" className="back">{t("rep.back")}</Link>
        <p className="muted">{t("rep.missing")}</p>
      </AppShell>
    );
  }
  if (!canManage) {
    return (
      <AppShell title={t("rep.title")}>
        <Link href="/reports" className="back">{t("rep.back")}</Link>
        <p className="muted">{t("rep.forbidden")}</p>
      </AppShell>
    );
  }

  return <Editor key={report?.id ?? "new"} initial={report ?? null} />;
}

function Editor({ initial }: { initial: ProjectReport | null }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { getToken } = useAuth();
  const { files, reports } = useReports();
  const { offers, canView: canViewOffers } = useOffers();
  const [savedId, setSavedId] = useState(initial?.id ?? "");
  const [pending, setPending] = useState<{ key: string; file: File }[]>([]);
  const [pickKey, setPickKey] = useState(0);
  // New reports can start from a project page (/reports/new?project=<id>)
  const startProject = useSearchParams().get("project") ?? "";
  const [projectId, setProjectId] = useState(initial?.projectId ?? (initial ? "" : startProject));
  const [projectEn, setProjectEn] = useState(initial?.projectEn ?? "");
  const [projectAr, setProjectAr] = useState(initial?.projectAr ?? "");
  const [date, setDate] = useState(initial?.date ?? qatarToday());
  const [weather, setWeather] = useState(initial?.weather ?? "");
  const [service, setService] = useState<ReportService>(initial?.service ?? "finishing");
  const [workers, setWorkers] = useState(String(initial?.workers ?? 0));
  const [subcontractors, setSubcontractors] = useState(initial?.subcontractors ?? "");
  const [progress, setProgress] = useState(String(initial?.progress ?? 0));
  const [issues, setIssues] = useState(initial?.issues ?? "");
  const [items, setItems] = useState<DraftItem[]>(() => (initial?.items ?? []).map((item, index) => ({ ...item, key: `${initial?.id ?? "new"}-${index}` })));
  const [error, setError] = useState("");
  // The project's offers (accepted ones first) and its latest earlier report, to start the work list from
  const projectOffers = canViewOffers && projectId
    ? offers.filter((offer) => offer.projectId === projectId && offer.status !== "rejected").sort((a, b) => Number(b.status === "accepted") - Number(a.status === "accepted"))
    : [];
  const previous = projectId ? latestReport(reports, projectId, initial?.id ?? "") : null;
  function addItems(extra: WorkItem[]) {
    setItems((current) => {
      const merged = mergeWorkItems(current, extra);
      return [...current, ...merged.slice(current.length).map((item) => ({ ...item, key: crypto.randomUUID() }))];
    });
  }
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateItem(key: string, patch: Partial<WorkItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function addFiles(list: File[]) {
    setPickKey((value) => value + 1);
    if (!list.length) return;
    const savedCount = files.filter((item) => item.reportId === savedId).length;
    const added: { key: string; file: File }[] = [];
    let problemText = "";
    for (const file of list) {
      const problem = fileProblem(file.type, file.size, file.name);
      if (problem) {
        problemText = t(problem);
        continue;
      }
      if (savedCount + pending.length + added.length >= 10) {
        problemText = t("rep.fileLimit");
        break;
      }
      added.push({ key: crypto.randomUUID(), file });
    }
    setFileError(problemText);
    setPending((current) => [...current, ...added]);
  }

  const saved = files.filter((file) => file.reportId === savedId);

  async function save() {
    if (saving) return;
    const workerCount = Number(workers);
    const progressCount = Number(progress);
    const input: ReportInput = {
      projectId,
      projectEn,
      projectAr,
      date,
      weather,
      service,
      workers: workerCount,
      subcontractors,
      progress: progressCount,
      issues,
      items: items.map(({ area, work, done, status }) => ({ area, work, done, status })),
    };
    // Every report needs at least one photo or document as proof
    if (saved.length + pending.length === 0) {
      setError(t("rep.needProof"));
      return;
    }
    setSaving(true);
    const result = savedId
      ? await updateProjectReport(await getToken(), savedId, input)
      : await createProjectReport(await getToken(), input);
    if (!result.ok) {
      setSaving(false);
      setError(t(result.error ?? "auth.failed"));
      return;
    }
    const reportId = savedId || result.id;
    if (!reportId) {
      setSaving(false);
      setError(t("auth.failed"));
      return;
    }
    setSavedId(reportId);
    const token = await getToken();
    for (const item of pending) {
      const problem = fileProblem(item.file.type, item.file.size, item.file.name);
      if (problem) {
        setSaving(false);
        setFileError(t(problem));
        return;
      }
      const body = new FormData();
      body.set("token", token);
      body.set("purpose", "report");
      body.set("reportId", reportId);
      body.set("name", item.file.name);
      body.set("file", item.file);
      const response = await fetch("/api/hr/files", { method: "POST", body });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setSaving(false);
        setFileError(t(payload.error ?? "auth.failed"));
        return;
      }
      setPending((current) => current.filter((row) => row.key !== item.key));
    }
    setSaving(false);
    router.push("/reports");
  }

  return (
    <AppShell title={initial ? t("rep.edit") : t("rep.title")}>
      <div className="rep">
      <Link href="/reports" className="back">
        <Icon name="chevl" className="icon icon--sm icon--flip" />
        <span>{t("rep.back")}</span>
      </Link>
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("nav.reports")}</span>
          <h2 className="page-title">{initial ? t("rep.edit") : t("rep.new")}</h2>
          {initial ? <p className="page-sub">{projectTitle(initial, locale)}</p> : null}
        </div>
      </div>
      <form
        className="card stack"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="form-grid">
          <ProjectSelect
            id="report-project"
            required
            value={projectId}
            onChange={(id, project) => {
              setProjectId(id);
              setProjectEn(project?.nameEn ?? "");
              setProjectAr(project?.nameAr ?? "");
            }}
          />
          <Field label={t("rep.date")} value={date} onChange={setDate} type="date" />
        </div>
        <div className="form-grid">
          <Field label={t("rep.weather")} value={weather} onChange={setWeather} />
          <Field label={t("rep.workers")} value={workers} onChange={setWorkers} type="number" />
          <Field label={t("rep.progress")} value={progress} onChange={setProgress} type="number" />
        </div>
        <div className="field">
          <span className="label">{t("rep.service")}</span>
          <div className="hstack">
            {reportServices.map((item) => (
              <button key={item} type="button" className="chip" aria-pressed={service === item} onClick={() => setService(item)}>
                {t(`svc.${item}`)}
              </button>
            ))}
          </div>
        </div>
        <Field label={t("rep.subs")} value={subcontractors} onChange={setSubcontractors} />
        <div className="between">
          <h3 className="card-title">{t("col.work")}</h3>
          <div className="hstack">
          {projectOffers.length > 0 ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => addItems(offerWorkItems(projectOffers, locale))}>
              {t("rep.fromOffer", { count: projectOffers.length })}
            </button>
          ) : null}
          {previous ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => addItems(previous.items)}>
              {t("rep.fromLast", { date: previous.date })}
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setItems((current) => [...current, { key: crypto.randomUUID(), area: "", work: "", done: 0, status: "progress" }])}
          >
            <Icon name="plus" />
            {t("rep.addItem")}
          </button>
          </div>
        </div>
        {projectId && projectOffers.length > 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {t("rep.linkedOffers")}{" "}
            {projectOffers.map((offer, i) => (
              <span key={offer.id}>{i ? ", " : ""}<Link href={`/offers/${offer.id}/quotation`}><bdi>{offer.number}</bdi></Link></span>
            ))}
          </p>
        ) : null}
        <div className="card card--flush table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th>{t("col.area")}</th>
                <th>{t("col.work")}</th>
                <th>{t("col.done")}</th>
                <th>{t("col.status")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan={5}>{t("rep.itemEmpty")}</td></tr> : null}
              {items.map((item) => (
                <tr key={item.key}>
                  <td data-label={t("col.area")}><input className="input" value={item.area} onChange={(event) => updateItem(item.key, { area: event.target.value })} /></td>
                  <td data-label={t("col.work")}><input className="input" value={item.work} onChange={(event) => updateItem(item.key, { work: event.target.value })} /></td>
                  <td data-label={t("col.done")}><input className="input num" type="number" min={0} max={100} value={item.done} onChange={(event) => updateItem(item.key, { done: Number(event.target.value) })} /></td>
                  <td data-label={t("col.status")}>
                    <select className="select select--sm" value={item.status} onChange={(event) => updateItem(item.key, { status: event.target.value as WorkStatus })}>
                      {workStatuses.map((status) => <option key={status} value={status}>{t(`wi.${status}`)}</option>)}
                    </select>
                  </td>
                  <td className="end" data-label="">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}>{t("us.delete")}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="field">
          <label>{t("rep.issues")}</label>
          <textarea className="textarea" value={issues} onChange={(event) => setIssues(event.target.value)} />
        </div>
        <div className="field">
          <label>{t("rep.proof")} <span style={{ color: "var(--danger)" }} aria-hidden="true">*</span></label>
          <label className="file-pick">
            <span className="btn btn--secondary btn--sm">{t("hr.fileChoose")}</span>
            <span className="file-pick__name">{t("hr.fileNone")}</span>
            <input key={pickKey} type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => {
              const next = Array.from(event.target.files ?? []);
              event.currentTarget.value = "";
              addFiles(next);
            }} />
          </label>
          <small className="muted">{t("rep.proofHint")} · {t("hr.fileHint")} · {t("rep.fileLimit")}</small>
          {fileError ? <p style={{ color: "var(--danger)" }}>{fileError}</p> : null}
          {saved.map((file) => (
            <SavedFile
              key={file.id}
              file={file}
              onRemove={() => {
                // Keep at least one proof on a saved report (add the new one first, then remove)
                if (saved.length === 1 && pending.length === 0) {
                  setFileError(t("rep.lastProof"));
                  return;
                }
                void (async () => {
                  const result = await deleteReportFile(await getToken(), file.id);
                  if (!result.ok) setError(t(result.error ?? "auth.failed"));
                })();
              }}
            />
          ))}
          {pending.map((item) => (
            <LocalFile key={item.key} file={item.file} onRemove={() => setPending((current) => current.filter((row) => row.key !== item.key))} />
          ))}
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        <div className="hstack" style={{ justifyContent: "flex-end" }}>
          <Link href="/reports" className="btn btn--ghost">{t("btn.cancel")}</Link>
          <button type="submit" className="btn btn--primary" disabled={saving}>{initial ? t("set.save") : t("rep.submit")}</button>
        </div>
      </form>
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function LocalFile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const t = useTranslations();
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return (
    <div className="file-chip">
      {url ? <img className="file-chip__thumb" src={url} alt="" /> : <span className="file-chip__thumb file-chip__thumb--icon"><Icon name="report" /></span>}
      <div className="grow"><b>{file.name}</b><small className="muted" style={{ display: "block" }}>{t("rep.notUploaded")}</small></div>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => {
          // Open the local file (not uploaded yet) in a new tab
          const local = URL.createObjectURL(file);
          window.open(local, "_blank", "noopener,noreferrer");
          window.setTimeout(() => URL.revokeObjectURL(local), 60_000);
        }}
      >
        {t("rep.preview")}
      </button>
      <button type="button" className="icon-btn file-chip__remove" aria-label={t("hr.fileRemove")} onClick={onRemove}>
        <Icon name="x" className="icon icon--sm" />
      </button>
    </div>
  );
}

function SavedFile({ file, onRemove }: { file: ReportFile; onRemove: () => void }) {
  const t = useTranslations();
  const { getToken } = useAuth();
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!file.contentType.startsWith("image/")) return;
    let active = true;
    void (async () => {
      const result = await openReportFile(await getToken(), file.id);
      if (active && result.ok) setUrl(result.url);
    })();
    return () => {
      active = false;
    };
    // The token reader always uses the current Firebase user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.contentType, file.id]);

  async function preview() {
    const result = await openReportFile(await getToken(), file.id);
    if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="file-chip">
      {url ? <img className="file-chip__thumb" src={url} alt="" /> : <span className="file-chip__thumb file-chip__thumb--icon"><Icon name="report" /></span>}
      <div className="grow"><b>{file.name}</b></div>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => void preview()}>{t("rep.preview")}</button>
      <button type="button" className="icon-btn file-chip__remove" aria-label={t("hr.fileRemove")} onClick={onRemove}>
        <Icon name="x" className="icon icon--sm" />
      </button>
    </div>
  );
}
