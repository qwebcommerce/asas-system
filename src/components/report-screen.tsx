"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { Toast } from "@/components/ui/overlay";

const services = ["construction", "finishing", "interior", "furniture", "plans"] as const;
const rows = [
  { area: "areaMajlis", work: "workGypsum", done: "100%", status: "complete", badge: "ok" },
  { area: "areaDining", work: "workGypsum", done: "100%", status: "complete", badge: "ok" },
  { area: "areaBeds", work: "workPrimer", done: "40%", status: "progress", badge: "info" },
  { area: "areaBeds", work: "workPorcelain", done: "0%", status: "waiting", badge: "warn" },
] as const;

export function ReportScreen() {
  const t = useTranslations();
  const [service, setService] = useState<(typeof services)[number]>("finishing");
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 3000);
  }

  return (
    <AppShell title={t("rep.title")}>
      <Link href="/reports" className="back">
        <Icon name="chevl" className="icon icon--sm icon--flip" />
        <span>{t("rep.back")}</span>
      </Link>
      <div className="split split--wide">
        <div className="card stack">
          <div className="between">
            <h2 className="card-title" style={{ fontSize: 18 }}>{t("rep.title")}</h2>
            <button type="button" className="chip chip--ai">
              <Icon name="spark" className="icon icon--sm" />
              {t("rep.ai")}
            </button>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>{t("rep.project")}</label>
              <select className="select" defaultValue="lusail">
                <option value="lusail">{t("sample.projectLusail")}</option>
              </select>
            </div>
            <div className="field">
              <label>{t("rep.date")}</label>
              <input className="input" type="date" defaultValue="2026-11-02" />
            </div>
            <div className="field">
              <label>{t("rep.weather")}</label>
              <select className="select">
                <option>{t("sample.weather")}</option>
              </select>
            </div>
          </div>
          <div className="field">
            <span className="label">{t("rep.service")}</span>
            <div className="hstack">
              {services.map((item) => (
                <button key={item} type="button" className="chip" aria-pressed={service === item} onClick={() => setService(item)}>
                  {t(`svc.${item}`)}
                </button>
              ))}
            </div>
          </div>
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
                {rows.map((row) => (
                  <tr key={`${row.area}-${row.work}`}>
                    <td data-label={t("col.area")} className="strong">{t(`sample.${row.area}`)}</td>
                    <td data-label={t("col.work")}>{t(`sample.${row.work}`)}</td>
                    <td data-label={t("col.done")} className="num"><bdi>{row.done}</bdi></td>
                    <td data-label={t("col.status")}>
                      <span className={`badge badge--${row.badge}`}>{t(`wi.${row.status}`)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>{t("rep.workers")}</label>
              <input className="input num" defaultValue="14" />
            </div>
            <div className="field">
              <label>{t("rep.subs")}</label>
              <input className="input" defaultValue={t("sample.subs")} />
            </div>
            <div className="field">
              <label>{t("rep.progress")}</label>
              <input className="input num" defaultValue="65%" />
            </div>
          </div>
          <div className="field">
            <label>{t("rep.issues")}</label>
            <textarea className="textarea" defaultValue={t("sample.issues")} />
          </div>
        </div>
        <div className="stack">
          <div className="card stack stack--sm">
            <div className="between">
              <h3 className="card-title">{t("rep.photos")}</h3>
              <small className="muted num">3 / 10</small>
            </div>
            <div className="grid-2">
              <div className="photo" />
              <div className="photo" style={{ background: "var(--steel)" }} />
              <div className="photo" style={{ background: "var(--mist)" }} />
              <label className="dropzone">
                <Icon name="camera" />
                <span>{t("rep.add")}</span>
                <input type="file" accept="image/*" capture="environment" hidden />
              </label>
            </div>
          </div>
          <div className="ai">
            <Icon name="spark" />
            <div>
              <b>{t("rep.checkT")}</b>
              <span>{t("rep.checkS")}</span>
            </div>
          </div>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => notify(t("rep.sentT"), t("rep.sentS"))}>
            <Icon name="send" />
            {t("rep.submit")}
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => notify(t("btn.saveDraft"), t("sample.draftSaved"))}>
            {t("btn.saveDraft")}
          </button>
        </div>
      </div>
      <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
    </AppShell>
  );
}
