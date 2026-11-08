"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useReports } from "@/components/use-reports";
import { Toast } from "@/components/ui/overlay";
import { Link } from "@/i18n/navigation";
import { projectTitle } from "@/lib/reports";
import { deleteProjectReport } from "@/server/reports";

export function ReportScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { reports, ready, canManage, canView } = useReports();
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);
  const [error, setError] = useState("");
  const ordered = [...reports].sort((a, b) => b.date.localeCompare(a.date) || projectTitle(a, locale).localeCompare(projectTitle(b, locale)));

  return (
    <AppShell title={t("nav.reports")}>
      <div className="rep">
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("nav.reports")}</span>
          <h2 className="page-title">{t("nav.reports")}</h2>
          <p className="page-sub">{ready ? t("rep.count", { count: reports.length }) : t("common.loading")}</p>
        </div>
        {canManage ? (
          <div className="hstack page-actions">
            <Link href="/reports/new" className="btn btn--primary">
              <Icon name="plus" />
              {t("rep.new")}
            </Link>
          </div>
        ) : null}
      </div>
      {!canView ? <p className="muted">{t("rep.forbidden")}</p> : null}
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {canView ? (
        <div className="card card--flush table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th>{t("rep.date")}</th>
                <th>{t("rep.project")}</th>
                <th>{t("rep.service")}</th>
                <th>{t("rep.progress")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ordered.length === 0 ? <tr><td colSpan={5}>{ready ? t("rep.empty") : t("common.loading")}</td></tr> : null}
              {ordered.map((report) => (
                <tr key={report.id}>
                  <td data-label={t("rep.date")} className="num">{formatDay(report.date, locale)}</td>
                  <td data-label={t("rep.project")}>
                    <b>{projectTitle(report, locale)}</b>
                    <small className="muted" style={{ display: "block" }}>{locale === "ar" ? report.projectEn : report.projectAr}</small>
                  </td>
                  <td data-label={t("rep.service")}>{t(`svc.${report.service}`)}</td>
                  <td data-label={t("rep.progress")} className="num"><bdi>{report.progress}%</bdi></td>
                  <td className="end" data-label="">
                    <div className="hstack">
                      <Link href={`/reports/${report.id}`} className="btn btn--secondary btn--sm">{t("rep.view")}</Link>
                      {canManage ? (
                        <>
                        <Link href={`/reports/${report.id}/edit`} className="btn btn--secondary btn--sm">{t("us.edit")}</Link>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => {
                            void (async () => {
                              const result = await deleteProjectReport(await getToken(), report.id);
                              if (!result.ok) {
                                setError(t(result.error ?? "auth.failed"));
                                return;
                              }
                              setError("");
                              setToast({ title: t("rep.removed"), detail: projectTitle(report, locale) });
                              window.setTimeout(() => setToast(null), 3000);
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
      ) : null}
      <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
      </div>
    </AppShell>
  );
}

function formatDay(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${value}T12:00:00+03:00`));
}
