"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icon";

export function FilePick({
  label,
  hint,
  title,
  file,
  onChange,
}: {
  label: string;
  hint: string;
  title: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const t = useTranslations();
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const chosen = title.trim();
  const thumb = preview?.file === file ? preview.url : "";

  useEffect(() => {
    if (!file?.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);

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
          <button type="button" className="icon-btn file-chip__remove" aria-label={t("hr.fileRemove")} onClick={() => onChange(null)}>
            <Icon name="x" className="icon icon--sm" />
          </button>
        </div>
      ) : (
        <label className="file-pick">
          <span className="btn btn--secondary btn--sm">{t("hr.fileChoose")}</span>
          <span className="file-pick__name">{t("hr.fileNone")}</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          />
        </label>
      )}
      <small className="muted">{hint}</small>
    </div>
  );
}
