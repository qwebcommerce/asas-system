"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { FilePick, StoredPreview } from "@/components/file-pick";
import { Icon } from "@/components/icon";
import { useHr } from "@/components/use-hr";
import { Modal, Toast } from "@/components/ui/overlay";
import { fileProblem } from "@/lib/files";
import { type EmployeeFile } from "@/lib/hr";
import { Link } from "@/i18n/navigation";
import { deleteEmployeeFile, openStoredFile, updateEmployeeFile } from "@/server/hr";

export function EmployeeScreen({ employeeId }: { employeeId: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { employees, files, ready, canManage } = useHr();
  const person = employees.find((item) => item.id === employeeId) ?? null;
  const ownFiles = files.filter((item) => item.employeeId === employeeId);
  const [editing, setEditing] = useState<EmployeeFile | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);
  const [error, setError] = useState("");

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function openFile(id: string) {
    const result = await openStoredFile(await getToken(), "employee", id);
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  const salary = !person || person.basic === null ? t("time.none") : new Intl.NumberFormat(locale, { style: "currency", currency: "QAR", numberingSystem: "latn" }).format(person.basic);

  return (
    <AppShell title={person?.name ?? t("hr.title")}>
      <div className="hr">
      <div className="page-header">
        <div>
          <Link href="/hr" className="link">{t("hr.back")}</Link>
          <h2 className="page-title">{person?.name ?? t("hr.missing")}</h2>
          {person ? <p className="page-sub num"><bdi>{person.employeeId}</bdi></p> : null}
        </div>
      </div>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {!ready ? <p className="muted">{t("common.loading")}</p> : null}
      {ready && !person ? <p className="muted">{t("hr.missing")}</p> : null}
      {person ? (
        <div className="stack">
          <div className="card stack">
            <div className="kv"><span>{t("hr.position")}</span><b>{person.positionEn}</b></div>
            <div className="kv"><span>{t("hr.positionAr")}</span><b>{person.positionAr || t("time.none")}</b></div>
            <div className="kv"><span>{t("col.dept")}</span><b>{t(`dir.${person.department}`)}</b></div>
            <div className="kv"><span>{t("reg.mobile")}</span><b className="num"><bdi>{person.mobile || t("time.none")}</bdi></b></div>
            <div className="kv"><span>{t("hr.joinDate")}</span><b>{formatMonth(person.joined, locale, t("time.none"))}</b></div>
            <div className="kv"><span>{t("col.status")}</span><b>{person.employment === "active" ? t("st.active") : t("hr.inactive")}</b></div>
            <div className="kv"><span>{t("hr.idExpiry")}</span><b className="num">{formatDay(person.idExpiry, locale, t("time.none"))}</b></div>
            <div className="kv"><span>{t("hr.passportExpiry")}</span><b className="num">{formatDay(person.passportExpiry, locale, t("time.none"))}</b></div>
            <div className="kv"><span>{t("hr.visaExpiry")}</span><b className="num">{formatDay(person.visaExpiry, locale, t("time.none"))}</b></div>
            <div className="kv"><span>{t("hr.basic")}</span><b className="num">{salary}</b></div>
            <div className="kv"><span>{t("hr.linkUser")}</span><b>{person.userId ? t("hr.linked") : t("hr.noUser")}</b></div>
          </div>
          <div className="between">
            <h3 className="card-title">{t("hr.files")}</h3>
            {canManage ? (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => { setEditing(null); setAdding(true); }}>
                <Icon name="plus" />
                {t("hr.fileAdd")}
              </button>
            ) : null}
          </div>
          <div className="card card--flush table-wrap">
            <table className="table table--cards">
              <thead>
                <tr>
                  <th>{t("hr.docTitle")}</th>
                  <th>{t("hr.docTitleAr")}</th>
                  <th>{t("hr.file")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ownFiles.length === 0 ? <tr><td colSpan={4}>{t("hr.fileEmpty")}</td></tr> : null}
                {ownFiles.map((item) => (
                  <tr key={item.id}>
                    <td data-label={t("hr.docTitle")} className="strong">{item.titleEn}</td>
                    <td data-label={t("hr.docTitleAr")}>{item.titleAr}</td>
                    <td data-label={t("hr.file")}>
                      <StoredPreview
                        title={locale === "ar" ? item.titleAr || item.titleEn : item.titleEn}
                        subtitle={formatBytes(item.size, locale)}
                        contentType={item.contentType}
                        previewKey={item.id}
                        loadImage={async () => {
                          const result = await openStoredFile(await getToken(), "employee", item.id);
                          return result.ok ? result.url : "";
                        }}
                        onOpen={() => void openFile(item.id)}
                        onRemove={canManage ? () => {
                          void (async () => {
                            const result = await deleteEmployeeFile(await getToken(), item.id);
                            if (!result.ok) setError(t(result.error ?? "auth.failed"));
                            else notify(t("hr.fileRemoved"), item.titleEn);
                          })();
                        } : undefined}
                      />
                    </td>
                    <td className="end" data-label="">
                      {canManage ? (
                        <div className="hstack">
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setAdding(false); setEditing(item); }}>{t("us.edit")}</button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => {
                              void (async () => {
                                const result = await deleteEmployeeFile(await getToken(), item.id);
                                if (!result.ok) setError(t(result.error ?? "auth.failed"));
                                else notify(t("hr.fileRemoved"), item.titleEn);
                              })();
                            }}
                          >
                            {t("us.delete")}
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <FileModal
        open={adding || editing !== null}
        fileRecord={editing}
        onClose={() => { setAdding(false); setEditing(null); }}
        onSave={async (titleEn, titleAr, file) => {
          if (editing && !file) {
            const result = await updateEmployeeFile(await getToken(), editing.id, { titleEn, titleAr });
            if (!result.ok) return result.error ?? "auth.failed";
            notify(t("hr.fileSaved"), titleEn);
            return "";
          }
          if (!file) return "hr.fileType";
          const problem = fileProblem(file.type, file.size, file.name);
          if (problem) return problem;
          const body = new FormData();
          body.set("token", await getToken());
          body.set("purpose", editing ? "employee-update" : "employee");
          body.set("employeeId", employeeId);
          if (editing) body.set("fileId", editing.id);
          body.set("titleEn", titleEn);
          body.set("titleAr", titleAr);
          body.set("file", file);
          const response = await fetch("/api/hr/files", { method: "POST", body });
          const result = (await response.json()) as { ok: boolean; error?: string };
          if (!result.ok) return result.error ?? "auth.failed";
          notify(t("hr.fileSaved"), titleEn);
          return "";
        }}
      />
      <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
      </div>
    </AppShell>
  );
}

function FileModal({
  open,
  fileRecord,
  onClose,
  onSave,
}: {
  open: boolean;
  fileRecord: EmployeeFile | null;
  onClose: () => void;
  onSave: (titleEn: string, titleAr: string, file: File | null) => Promise<string>;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitleEn(fileRecord?.titleEn ?? "");
    setTitleAr(fileRecord?.titleAr ?? "");
    setFile(null);
    setError("");
  }, [open, fileRecord]);

  function close() {
    setTitleEn("");
    setTitleAr("");
    setFile(null);
    setError("");
    onClose();
  }

  return (
    <Modal open={open} title={fileRecord ? t("us.edit") : t("hr.fileAdd")} onClose={close}>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(titleEn, titleAr, file).then((message) => {
            if (message) {
              setError(t(message));
              return;
            }
            close();
          });
        }}
      >
        <Field label={t("hr.docTitle")} value={titleEn} onChange={setTitleEn} />
        <Field label={t("hr.docTitleAr")} value={titleAr} onChange={setTitleAr} />
        <FilePick
          label={t("hr.file")}
          hint={fileRecord ? `${t("hr.fileHint")} · ${t("hr.fileKeep")}` : t("hr.fileHint")}
          title={locale === "ar" ? titleAr || titleEn : titleEn || titleAr}
          file={file}
          resetKey={`${open}:${fileRecord?.id ?? "new"}`}
          onChange={setFile}
        />
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        <div className="hstack" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={close}>{t("btn.cancel")}</button>
          <button type="submit" className="btn btn--primary">{fileRecord ? t("set.save") : t("hr.fileAdd")}</button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function formatDay(value: string, locale: string, empty: string) {
  if (!value) return empty;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${value}T12:00:00+03:00`));
}

function formatMonth(value: string, locale: string, empty: string) {
  if (!value) return empty;
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${value}T00:00:00+03:00`));
}

function formatBytes(size: number, locale: string) {
  const format = new Intl.NumberFormat(locale, { numberingSystem: "latn", maximumFractionDigits: size < 1024 * 1024 ? 0 : 1 });
  if (size < 1024 * 1024) return `${format.format(size / 1024)} KB`;
  return `${format.format(size / (1024 * 1024))} MB`;
}
