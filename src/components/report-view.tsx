"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { StoredPreview } from "@/components/file-pick";
import { Icon } from "@/components/icon";
import { useReports } from "@/components/use-reports";
import { Link } from "@/i18n/navigation";
import { projectTitle } from "@/lib/reports";
import { openReportFile } from "@/server/reports";

export function ReportView({ reportId }: { reportId: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { reports, files, ready, canManage, canView } = useReports();
  const report = reports.find((item) => item.id === reportId);
  const ownFiles = files.filter((item) => item.reportId === reportId);
  const [error, setError] = useState("");

  if (!canView && ready) {
    return <AppShell title={t("nav.reports")}><p className="muted">{t("rep.forbidden")}</p></AppShell>;
  }
  if (!ready) {
    return <AppShell title={t("nav.reports")}><p className="muted">{t("common.loading")}</p></AppShell>;
  }
  if (!report) {
    return (
      <AppShell title={t("nav.reports")}>
        <Link href="/reports" className="back">{t("rep.back")}</Link>
        <p className="muted">{t("rep.missing")}</p>
      </AppShell>
    );
  }

  async function openFile(id: string) {
    const result = await openReportFile(await getToken(), id);
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <AppShell title={t("nav.reports")}>
      <div className="rep">
        <Link href="/reports" className="back">
          <Icon name="chevl" className="icon icon--sm icon--flip" />
          <span>{t("rep.back")}</span>
        </Link>
        <div className="page-header">
          <div>
            <span className="eyebrow">{t("nav.reports")}</span>
            <h2 className="page-title">{projectTitle(report, locale)}</h2>
            <p className="page-sub">{locale === "ar" ? report.projectEn : report.projectAr}</p>
          </div>
          {canManage ? (
            <div className="hstack page-actions">
              <Link href={`/reports/${report.id}/edit`} className="btn btn--primary">{t("rep.edit")}</Link>
            </div>
          ) : null}
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        <div className="card stack stack--sm">
          <div className="kv"><span>{t("rep.date")}</span><b className="num">{formatDay(report.date, locale)}</b></div>
          <div className="kv"><span>{t("rep.project")}</span><b>{report.projectEn}</b></div>
          <div className="kv"><span>{t("rep.projectAr")}</span><b>{report.projectAr || t("time.none")}</b></div>
          <div className="kv"><span>{t("rep.weather")}</span><b>{report.weather || t("time.none")}</b></div>
          <div className="kv"><span>{t("rep.service")}</span><b>{t(`svc.${report.service}`)}</b></div>
          <div className="kv"><span>{t("rep.workers")}</span><b className="num">{report.workers}</b></div>
          <div className="kv"><span>{t("rep.subs")}</span><b>{report.subcontractors || t("time.none")}</b></div>
          <div className="kv"><span>{t("rep.progress")}</span><b className="num"><bdi>{report.progress}%</bdi></b></div>
          <div className="kv"><span>{t("rep.issues")}</span><b>{report.issues || t("time.none")}</b></div>
        </div>
        <h3 className="card-title">{t("col.work")}</h3>
        <div className="card card--flush table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th>{t("col.area")}</th>
                <th>{t("col.work")}</th>
                <th>{t("col.done")}</th>
                <th>{t("col.status")}</th>
              </tr>
            </thead>
            <tbody>
              {report.items.length === 0 ? <tr><td colSpan={4}>{t("rep.itemEmpty")}</td></tr> : null}
              {report.items.map((item, index) => (
                <tr key={`${index}-${item.area}`}>
                  <td data-label={t("col.area")} className="strong">{item.area}</td>
                  <td data-label={t("col.work")}>{item.work}</td>
                  <td data-label={t("col.done")} className="num"><bdi>{item.done}%</bdi></td>
                  <td data-label={t("col.status")}>{t(`wi.${item.status}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="card-title">{t("rep.documents")}</h3>
        {ownFiles.length === 0 ? <p className="muted">{t("hr.fileEmpty")}</p> : null}
        {ownFiles.map((file) => (
          <StoredPreview
            key={file.id}
            title={file.name}
            contentType={file.contentType}
            previewKey={file.id}
            loadImage={async () => {
              const result = await openReportFile(await getToken(), file.id);
              return result.ok ? result.url : "";
            }}
            onOpen={() => void openFile(file.id)}
          />
        ))}
      </div>
    </AppShell>
  );
}

function formatDay(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${value}T12:00:00+03:00`));
}
