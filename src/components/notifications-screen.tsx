"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useDocuments } from "@/components/use-documents";
import { daysUntil, documentTitle } from "@/lib/documents";
import type { Notice } from "@/lib/notices";
import { openLibraryFile } from "@/server/documents";

export function NotificationsScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { expiring, ready, canView } = useDocuments();
  const [error, setError] = useState("");
  const notices = useMemo(() => {
    const items: Notice[] = [...expiring]
      .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))
      .map((document) => {
        const days = daysUntil(document.expiresOn) ?? 0;
        return {
          id: `documentExpiry:${document.id}`,
          kind: "documentExpiry" as const,
          title: documentTitle(document, locale),
          body: days === 0 ? t("ntf.today") : t("ntf.soon", { count: days }),
          when: formatDay(document.expiresOn, locale),
          documentId: document.id,
          hasFile: document.hasFile,
        };
      });
    return items;
  }, [expiring, locale, t]);

  async function openFile(id: string) {
    const result = await openLibraryFile(await getToken(), id);
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  if (!canView && ready) {
    return <AppShell title={t("ntf.title")}><p className="muted">{t("common.forbidden")}</p></AppShell>;
  }

  return (
    <AppShell title={t("ntf.title")}>
      <div className="ntf">
        <div className="page-header">
          <div>
            <span className="eyebrow">{t("ntf.title")}</span>
            <h2 className="page-title">{t("ntf.title")}</h2>
            <p className="page-sub">{t("ntf.sub")}</p>
          </div>
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        <div className="card">
          {notices.length === 0 ? <p className="muted">{ready ? t("ntf.empty") : t("common.loading")}</p> : null}
          {notices.map((notice) => (
            <div className="list-row" key={notice.id}>
              <Icon name="clock" />
              <div className="grow">
                <b>{notice.title}</b>
                <small>{t(`ntf.kind.${notice.kind}`)} · {notice.body}</small>
              </div>
              <span className="num muted">{notice.when}</span>
              {notice.kind === "documentExpiry" && notice.hasFile ? (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => void openFile(notice.documentId)}>{t("hr.fileOpen")}</button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function formatDay(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${value}T12:00:00+03:00`));
}
