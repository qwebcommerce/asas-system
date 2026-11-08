"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { FilePick, StoredPreview } from "@/components/file-pick";
import { Icon } from "@/components/icon";
import { sortDocuments, useDocuments } from "@/components/use-documents";
import { Modal, Toast } from "@/components/ui/overlay";
import { Link } from "@/i18n/navigation";
import { daysUntil, documentKinds, documentTitle, isExpiringSoon, type DocumentKind, type LibraryDocument, type LibraryDocumentInput } from "@/lib/documents";
import { fileProblem } from "@/lib/files";
import { clearLibraryFile, createLibraryDocument, deleteLibraryDocument, openLibraryFile, updateLibraryDocument } from "@/server/documents";

const filters = [
  { id: "all", label: "f1" },
  { id: "expiring", label: "f3" },
  { id: "contract", label: "f4" },
  { id: "drawing", label: "f5" },
  { id: "permit", label: "f6" },
] as const;

export function DocumentsScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { documents, expiring, ready, canEdit } = useDocuments();
  const [folder, setFolder] = useState<(typeof filters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<LibraryDocument | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);
  const ordered = useMemo(() => sortDocuments(documents, locale), [documents, locale]);
  const visible = ordered.filter((document) => {
    const needle = query.trim().toLowerCase();
    const inFolder = folder === "all"
      || (folder === "expiring" && document.hasExpiry && isExpiringSoon(document.expiresOn))
      || document.kind === folder;
    if (!inFolder) return false;
    if (!needle) return true;
    return [document.titleEn, document.titleAr, document.projectEn, document.projectAr].some((value) => value.toLowerCase().includes(needle));
  });

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function openFile(id: string) {
    const result = await openLibraryFile(await getToken(), id);
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <AppShell title={t("nav.documents")}>
      <div className="docs">
        <div className="page-header">
          <div>
            <span className="eyebrow">{t("doc.eyebrow")}</span>
            <h2 className="page-title">{t("nav.documents")}</h2>
            <p className="page-sub">{ready ? `${t("doc.count", { count: documents.length })} · ${t("doc.expiringNote", { count: expiring.length })}` : t("common.loading")}</p>
          </div>
          <div className="hstack page-actions">
            <button type="button" className="btn btn--primary" onClick={() => { setEditing(null); setAdding(true); }}>
              <Icon name="upload" />
              {t("doc.upload")}
            </button>
          </div>
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        <div className="row">
          <nav className="docs-nav stack stack--sm" aria-label={t("nav.documents")}>
            {filters.map((item) => {
              const count = item.id === "all"
                ? documents.length
                : item.id === "expiring"
                  ? expiring.length
                  : documents.filter((document) => document.kind === item.id).length;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="nav-item"
                  style={{ color: "var(--text)", background: folder === item.id ? "var(--surface)" : "transparent", fontWeight: folder === item.id ? 600 : 400 }}
                  onClick={() => setFolder(item.id)}
                >
                  <span className="grow">{t(`doc.${item.label}`)}</span>
                  <small className="muted num">{count}</small>
                </button>
              );
            })}
          </nav>
          <div className="stack grow">
            <label className="search">
              <Icon name="search" className="icon icon--sm" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("doc.search")} />
            </label>
            <div className="card card--flush table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th>{t("col.name")}</th>
                    <th>{t("col.type")}</th>
                    <th>{t("doc.project")}</th>
                    <th>{t("hr.expires")}</th>
                    <th>{t("col.status")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? <tr><td colSpan={6}>{ready ? t("doc.empty") : t("common.loading")}</td></tr> : null}
                  {visible.map((document) => (
                    <tr key={document.id}>
                      <td data-label={t("col.name")}>
                        <b>{documentTitle(document, locale)}</b>
                        <small className="muted" style={{ display: "block" }}>{locale === "ar" ? document.titleEn : document.titleAr}</small>
                      </td>
                      <td data-label={t("col.type")}><span className="badge badge--accent badge--plain">{t(`dt.${document.kind}`)}</span></td>
                      <td data-label={t("doc.project")} className="muted">{locale === "ar" ? document.projectAr || document.projectEn || t("time.none") : document.projectEn || document.projectAr || t("time.none")}</td>
                      <td data-label={t("hr.expires")} className="num muted">{document.hasExpiry ? document.expiresOn : t("doc.noExpiry")}</td>
                      <td data-label={t("col.status")}>{expiryLabel(document, t)}</td>
                      <td className="end" data-label="">
                        <div className="hstack">
                          {document.hasFile ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => void openFile(document.id)}>{t("hr.fileOpen")}</button> : null}
                          {canEdit(document) ? (
                            <>
                              <button type="button" className="btn btn--secondary btn--sm" onClick={() => { setAdding(false); setEditing(document); }}>{t("us.edit")}</button>
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => {
                                  void (async () => {
                                    const result = await deleteLibraryDocument(await getToken(), document.id);
                                    if (!result.ok) setError(t(result.error ?? "auth.failed"));
                                    else notify(t("doc.removed"), documentTitle(document, locale));
                                  })();
                                }}
                              >
                                {t("us.delete")}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {expiring.length > 0 ? (
              <Link href="/notifications" className="ai">
                <Icon name="clock" />
                <span>{t("doc.expiringNote", { count: expiring.length })}</span>
              </Link>
            ) : null}
          </div>
        </div>
        <DocumentModal
          open={adding || editing !== null}
          document={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={(title) => notify(t("doc.saved"), title)}
          getToken={getToken}
        />
        <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
      </div>
    </AppShell>
  );
}

function expiryLabel(document: LibraryDocument, t: (key: string, values?: { count: number }) => string) {
  if (!document.hasExpiry) return t("doc.noExpiry");
  const days = daysUntil(document.expiresOn);
  if (days === null) return t("doc.noExpiry");
  if (days < 0) return t("ds.expired");
  if (days === 0) return t("ntf.today");
  if (days <= 30) return t("ntf.soon", { count: days });
  return t("doc.valid");
}

function DocumentModal({
  open,
  document,
  onClose,
  onSaved,
  getToken,
}: {
  open: boolean;
  document: LibraryDocument | null;
  onClose: () => void;
  onSaved: (title: string) => void;
  getToken: () => Promise<string>;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [kind, setKind] = useState<DocumentKind>("contract");
  const [projectEn, setProjectEn] = useState("");
  const [projectAr, setProjectAr] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiresOn, setExpiresOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dropFile, setDropFile] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitleEn(document?.titleEn ?? "");
    setTitleAr(document?.titleAr ?? "");
    setKind(document?.kind ?? "contract");
    setProjectEn(document?.projectEn ?? "");
    setProjectAr(document?.projectAr ?? "");
    setHasExpiry(document?.hasExpiry ?? false);
    setExpiresOn(document?.expiresOn ?? "");
    setFile(null);
    setDropFile(false);
    setSavedId("");
    setError("");
  }, [open, document]);

  function seed(next: LibraryDocument | null) {
    setTitleEn(next?.titleEn ?? "");
    setTitleAr(next?.titleAr ?? "");
    setKind(next?.kind ?? "contract");
    setProjectEn(next?.projectEn ?? "");
    setProjectAr(next?.projectAr ?? "");
    setHasExpiry(next?.hasExpiry ?? false);
    setExpiresOn(next?.expiresOn ?? "");
    setFile(null);
    setDropFile(false);
    setSavedId("");
    setError("");
  }

  function close() {
    seed(null);
    onClose();
  }

  async function save() {
    if (saving) return;
    if (hasExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) {
      setError(t("doc.expiryRequired"));
      return;
    }
    if (!document && !savedId && !file) {
      setError(t("hr.fileType"));
      return;
    }
    if (file) {
      const problem = fileProblem(file.type, file.size, file.name);
      if (problem) {
        setError(t(problem));
        return;
      }
    }
    const input: LibraryDocumentInput = { titleEn, titleAr, kind, projectEn, projectAr, hasExpiry, expiresOn };
    setSaving(true);
    const existingId = document?.id || savedId;
    const result = existingId
      ? await updateLibraryDocument(await getToken(), existingId, input)
      : await createLibraryDocument(await getToken(), input);
    if (!result.ok || !result.id) {
      setSaving(false);
      setError(t(result.ok ? "auth.failed" : result.error ?? "auth.failed"));
      return;
    }
    setSavedId(result.id);
    if (dropFile && !file) {
      const cleared = await clearLibraryFile(await getToken(), result.id);
      if (!cleared.ok) {
        setSaving(false);
        setError(t(cleared.error ?? "auth.failed"));
        return;
      }
    }
    if (file) {
      const body = new FormData();
      body.set("token", await getToken());
      body.set("purpose", "library");
      body.set("documentId", result.id);
      body.set("file", file);
      const response = await fetch("/api/hr/files", { method: "POST", body });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!payload.ok) {
        setSaving(false);
        setError(t(payload.error ?? "auth.failed"));
        return;
      }
    }
    setSaving(false);
    onSaved(locale === "ar" ? titleAr || titleEn : titleEn || titleAr);
    close();
  }

  return (
    <Modal
      open={open}
      title={document ? t("us.edit") : t("doc.upload")}
      onClose={close}
    >
      <DocumentForm
        key={`${open}:${document?.id ?? "new"}`}
        document={document}
        titleEn={titleEn}
        titleAr={titleAr}
        kind={kind}
        projectEn={projectEn}
        projectAr={projectAr}
        hasExpiry={hasExpiry}
        expiresOn={expiresOn}
        file={file}
        dropFile={dropFile}
        error={error}
        saving={saving}
        open={open}
        onTitleEn={setTitleEn}
        onTitleAr={setTitleAr}
        onKind={setKind}
        onProjectEn={setProjectEn}
        onProjectAr={setProjectAr}
        onHasExpiry={(value) => {
          setHasExpiry(value);
          if (!value) setExpiresOn("");
        }}
        onExpiresOn={setExpiresOn}
        onFile={setFile}
        onDropFile={setDropFile}
        onClose={close}
        onSave={() => void save()}
        getToken={getToken}
      />
    </Modal>
  );
}

function DocumentForm({
  document,
  titleEn,
  titleAr,
  kind,
  projectEn,
  projectAr,
  hasExpiry,
  expiresOn,
  file,
  dropFile,
  error,
  saving,
  open,
  onTitleEn,
  onTitleAr,
  onKind,
  onProjectEn,
  onProjectAr,
  onHasExpiry,
  onExpiresOn,
  onFile,
  onDropFile,
  onClose,
  onSave,
  getToken,
}: {
  document: LibraryDocument | null;
  titleEn: string;
  titleAr: string;
  kind: DocumentKind;
  projectEn: string;
  projectAr: string;
  hasExpiry: boolean;
  expiresOn: string;
  file: File | null;
  dropFile: boolean;
  error: string;
  saving: boolean;
  open: boolean;
  onTitleEn: (value: string) => void;
  onTitleAr: (value: string) => void;
  onKind: (value: DocumentKind) => void;
  onProjectEn: (value: string) => void;
  onProjectAr: (value: string) => void;
  onHasExpiry: (value: boolean) => void;
  onExpiresOn: (value: string) => void;
  onFile: (value: File | null) => void;
  onDropFile: (value: boolean) => void;
  onClose: () => void;
  onSave: () => void;
  getToken: () => Promise<string>;
}) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <form className="stack" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <div className="form-grid form-grid--2">
        <Field label={t("doc.titleEn")} value={titleEn} onChange={onTitleEn} />
        <Field label={t("doc.titleAr")} value={titleAr} onChange={onTitleAr} />
        <Field label={t("doc.project")} value={projectEn} onChange={onProjectEn} />
        <Field label={t("doc.projectAr")} value={projectAr} onChange={onProjectAr} />
      </div>
      <div className="field">
        <label>{t("col.type")}</label>
        <select className="select" value={kind} onChange={(event) => onKind(event.target.value as DocumentKind)}>
          {documentKinds.map((item) => <option key={item} value={item}>{t(`dt.${item}`)}</option>)}
        </select>
      </div>
      <label className="check">
        <input type="checkbox" checked={hasExpiry} onChange={(event) => onHasExpiry(event.target.checked)} />
        <span>{t("doc.hasExpiry")}</span>
      </label>
      {hasExpiry ? <Field label={t("hr.expires")} value={expiresOn} onChange={onExpiresOn} type="date" /> : null}
      {document?.hasFile && !file && !dropFile ? (
        <StoredPreview
          title={documentTitle(document, locale)}
          contentType={document.contentType}
          previewKey={document.id}
          loadImage={async () => {
            const result = await openLibraryFile(await getToken(), document.id);
            return result.ok ? result.url : "";
          }}
          onOpen={() => {
            void (async () => {
              const result = await openLibraryFile(await getToken(), document.id);
              if (result.ok) window.open(result.url, "_blank", "noopener,noreferrer");
            })();
          }}
          onRemove={() => onDropFile(true)}
        />
      ) : null}
      <FilePick
        label={t("hr.file")}
        hint={document && !dropFile ? `${t("hr.fileHint")} · ${t("hr.fileKeep")}` : t("hr.fileHint")}
        title={locale === "ar" ? titleAr || titleEn : titleEn || titleAr}
        file={file}
        resetKey={`${open}:${document?.id ?? "new"}:${dropFile}`}
        onChange={(next) => {
          onFile(next);
          if (next) onDropFile(false);
        }}
      />
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      <div className="hstack" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn btn--ghost" onClick={onClose}>{t("btn.cancel")}</button>
        <button type="submit" className="btn btn--primary" disabled={saving}>{document ? t("set.save") : t("doc.upload")}</button>
      </div>
    </form>
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
