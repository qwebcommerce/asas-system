"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icon";
import { fileProblem } from "@/lib/files";

export function FilePick({
  label,
  hint,
  title,
  file,
  resetKey,
  onChange,
}: {
  label: string;
  hint: string;
  title: string;
  file: File | null;
  resetKey: string;
  onChange: (file: File | null) => void;
}) {
  const t = useTranslations();
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [problem, setProblem] = useState("");
  const chosen = title.trim();
  const thumb = preview?.file === file ? preview.url : "";

  useEffect(() => {
    setProblem("");
  }, [resetKey]);

  useEffect(() => {
    if (!file?.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(next: File | null) {
    if (!next) {
      setProblem("");
      onChange(null);
      return;
    }
    const issue = fileProblem(next.type, next.size, next.name);
    if (issue) {
      setProblem(t(issue));
      onChange(null);
      return;
    }
    setProblem("");
    onChange(next);
  }

  return (
    <div className="field">
      <label>{label}</label>
      {file ? (
        <div className="file-chip">
          {thumb ? (
            <img className="file-chip__thumb" src={thumb} alt="" />
          ) : (
            <span className="file-chip__thumb file-chip__thumb--icon">
              <Icon name="report" />
            </span>
          )}
          <div className="grow">
            <b>{chosen || file.name}</b>
            {chosen ? <small className="muted">{file.name}</small> : null}
          </div>
          <button type="button" className="icon-btn file-chip__remove" aria-label={t("hr.fileRemove")} onClick={() => choose(null)}>
            <Icon name="x" className="icon icon--sm" />
          </button>
        </div>
      ) : (
        <label className="file-pick">
          <span className="btn btn--secondary btn--sm">{t("hr.fileChoose")}</span>
          <span className="file-pick__name">{t("hr.fileNone")}</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              event.currentTarget.value = "";
              choose(next);
            }}
          />
        </label>
      )}
      <small className="muted">{hint}</small>
      {problem ? <p style={{ color: "var(--danger)" }}>{problem}</p> : null}
    </div>
  );
}

export function StoredPreview({
  title,
  subtitle,
  contentType,
  previewKey,
  loadImage,
  onOpen,
  onRemove,
}: {
  title: string;
  subtitle?: string;
  contentType: string;
  previewKey: string;
  loadImage: () => Promise<string>;
  onOpen: () => void;
  onRemove?: () => void;
}) {
  const t = useTranslations();
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!contentType.startsWith("image/")) return;
    let active = true;
    void loadImage().then((next) => {
      if (active && next) setUrl(next);
    });
    return () => {
      active = false;
    };
    // loadImage reads the current signed-in user when it runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, previewKey]);

  return (
    <div className="file-chip">
      {url ? <img className="file-chip__thumb" src={url} alt="" /> : <span className="file-chip__thumb file-chip__thumb--icon"><Icon name="report" /></span>}
      <div className="grow">
        <b>{title}</b>
        {subtitle ? <small className="muted">{subtitle}</small> : null}
      </div>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onOpen}>{t("hr.fileOpen")}</button>
      {onRemove ? (
        <button type="button" className="icon-btn file-chip__remove" aria-label={t("hr.fileRemove")} onClick={onRemove}>
          <Icon name="x" className="icon icon--sm" />
        </button>
      ) : null}
    </div>
  );
}
