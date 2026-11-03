"use client";

import { useTranslations } from "next-intl";

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const t = useTranslations("common");
  return (
    <>
      <div className={`overlay${open ? " is-open" : ""}`} onClick={onClose} />
      <div className={`modal${open ? " is-open" : ""}`} role="dialog" aria-modal="true">
        <div className="between">
          <h2 style={{ fontSize: 20 }}>{title}</h2>
          <button type="button" className="close" onClick={onClose} aria-label={t("close")}>
            ×
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

export function Drawer({
  open,
  title,
  children,
  onClose,
  dark = false,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  dark?: boolean;
}) {
  const t = useTranslations("common");
  return (
    <>
      <div className={`overlay${open ? " is-open" : ""}`} onClick={onClose} />
      <aside className={`drawer${dark ? " drawer--dark" : ""}${open ? " is-open" : ""}`} role="dialog" aria-modal="true">
        <div className="between">
          <h2 style={{ fontSize: 20 }}>{title}</h2>
          <button type="button" className="close" onClick={onClose} aria-label={t("close")}>
            ×
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}

export function Toast({ open, title, detail }: { open: boolean; title: string; detail: string }) {
  return (
    <div className={`toast${open ? " is-open" : ""}`} role="status">
      <span className="tick">✓</span>
      <div>
        <b>{title}</b>
        <small>{detail}</small>
      </div>
    </div>
  );
}
