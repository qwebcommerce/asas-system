"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useReports } from "@/components/use-reports";
import { Link, useRouter } from "@/i18n/navigation";
import { fileProblem } from "@/lib/files";
import { qatarToday } from "@/lib/hr";
import { projectTitle, reportServices, workStatuses, type ProjectReport, type ReportFile, type ReportInput, type ReportService, type WorkItem, type WorkStatus } from "@/lib/reports";
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
  const { files } = useReports();
  const [savedId, setSavedId] = useState(initial?.id ?? "");
  const [pending, setPending] = useState<{ key: string; file: File }[]>([]);
  const [pickKey, setPickKey] = useState(0);
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
  const [saving, setSaving] = useState(false);

  function updateItem(key: string, patch: Partial<WorkItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function addFile(file: File | null) {
    setPickKey((value) => value + 1);
    if (!file) return;
    const problem = fileProblem(file.type, file.size);
    if (problem) {
      setError(t(problem));
      return;
    }
    const savedCount = files.filter((item) => item.reportId === savedId).length;
    if (savedCount + pending.length >= 10) {
      setError(t("rep.fileLimit"));
      return;
    }
    setError("");
    setPending((current) => [...current, { key: crypto.randomUUID(), file }]);
  }

  const saved = files.filter((file) => file.reportId === savedId);

  async function save() {
    if (saving) return;
    const workerCount = Number(workers);
    const progressCount = Number(progress);
    const input: ReportInput = {
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
        setError(t(payload.error ?? "auth.failed"));
        return;
      }
      setPending((current) => current.filter((row) => row.key !== item.key));
    }
    setSaving(false);
    router.push("/reports");
  }

  return (
    <AppShell title={initial ? t("rep.edit") : t("rep.title")}>
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
          <Field label={t("rep.project")} value={projectEn} onChange={setProjectEn} />
          <Field label={t("rep.projectAr")} value={projectAr} onChange={setProjectAr} />
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
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setItems((current) => [...current, { key: crypto.randomUUID(), area: "", work: "", done: 0, status: "progress" }])}
          >
            <Icon name="plus" />
            {t("rep.addItem")}
          </button>
        </div>
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
          <label>{t("rep.documents")}</label>
          <label className="file-pick">
            <span className="btn btn--secondary btn--sm">{t("hr.fileChoose")}</span>
            <span className="file-pick__name">{t("hr.fileNone")}</span>
            <input key={pickKey} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => addFile(event.target.files?.[0] ?? null)} />
          </label>
          <small className="muted">{t("hr.fileHint")} · {t("rep.fileLimit")}</small>
          {saved.map((file) => (
            <SavedFile
              key={file.id}
              file={file}
              onRemove={() => {
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
      <div className="grow"><b>{file.name}</b></div>
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
