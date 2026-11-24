"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useWeekly } from "@/components/use-weekly";
import { Modal } from "@/components/ui/overlay";
import { Link } from "@/i18n/navigation";
import type { WeeklyReport, WeeklyStatus } from "@/lib/weekly";
import { generateWeeklyNow, reviewWeekly } from "@/server/weekly";

function tone(status: WeeklyStatus) {
  return status === "approved" ? "ok" : status === "returned" ? "danger" : "warn";
}

function range(start: string, end: string, locale: string) {
  const format = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC", numberingSystem: "latn" });
  return `${format.format(new Date(`${start}T00:00:00Z`))} – ${format.format(new Date(`${end}T00:00:00Z`))}`;
}

/** Weekly tab of Project reports: generated each Thursday evening, approved or returned by a Super Admin. */
export function WeeklyReports({ notify }: { notify: (title: string, detail: string) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { weekly, ready, canView, canApprove } = useWeekly();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [returning, setReturning] = useState<WeeklyReport | null>(null);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState<"all" | WeeklyStatus>("all");
  const shown = weekly.filter((item) => filter === "all" || item.status === filter);
  const pending = weekly.filter((item) => item.status === "pending").length;
  const ar = locale === "ar";

  async function review(item: WeeklyReport, decision: "approved" | "returned", reviewNote = "") {
    setBusy(true);
    setError("");
    const result = await reviewWeekly(await getToken(), item.id, decision, reviewNote);
    setBusy(false);
    if (!result.ok) return setError(t(result.error));
    setReturning(null);
    setNote("");
    notify(t(decision === "approved" ? "wk.approvedToast" : "wk.returnedToast"), ar ? item.projectAr || item.projectEn : item.projectEn);
  }

  if (!canView) return <p className="muted">{t("wk.forbidden")}</p>;

  return (
    <div className="stack">
      <div className="between">
        <p className="muted" style={{ margin: 0 }}>{t("wk.intro")}</p>
        {canApprove ? (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                setError("");
                const result = await generateWeeklyNow(await getToken());
                setBusy(false);
                if (!result.ok) return setError(t(result.error));
                notify(t("wk.generated"), t("wk.generatedDetail", { created: result.created ?? 0, updated: result.updated ?? 0 }));
              })();
            }}
          >
            <Icon name="refresh" />
            {busy ? t("wk.generating") : t("wk.generate")}
          </button>
        ) : null}
      </div>
      <div className="hstack" role="group" aria-label={t("wk.filter")}>
        {(["all", "pending", "approved", "returned"] as const).map((key) => (
          <button key={key} type="button" className="chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {t(`wk.f.${key}`)}{key === "pending" && pending ? ` · ${pending}` : ""}
          </button>
        ))}
      </div>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {!ready ? <p className="muted">{t("common.loading")}</p> : null}
      {ready && shown.length === 0 ? <div className="card"><p className="muted" style={{ margin: 0 }}>{t("wk.empty")}</p></div> : null}
      {shown.map((item) => {
        const highlights = ar ? item.highlightsAr : item.highlightsEn;
        const risks = ar ? item.risksAr : item.risksEn;
        const change = item.stats.progressEnd - item.stats.progressStart;
        return (
          <article className="card stack stack--sm wk-card" key={item.id}>
            <div className="between">
              <div>
                <span className="eyebrow"><bdi>{range(item.weekStart, item.weekEnd, locale)}</bdi> · <bdi>{item.projectCode}</bdi></span>
                <h3 className="card-title" style={{ marginTop: 4 }}>
                  <Link href={`/projects/${item.projectId}`}>{ar ? item.projectAr || item.projectEn : item.projectEn}</Link>
                </h3>
              </div>
              <span className={`badge badge--${tone(item.status)}`}>{t(`wk.s.${item.status}`)}</span>
            </div>
            <div className="wk-stats">
              <div><small>{t("wk.reports")}</small><b className="num">{item.stats.reports}</b></div>
              <div><small>{t("wk.progress")}</small><b className="num"><bdi>{item.stats.progressStart}% → {item.stats.progressEnd}%</bdi></b><small className="num"><bdi>{change >= 0 ? "+" : ""}{change}</bdi></small></div>
              <div><small>{t("wk.avgWorkers")}</small><b className="num">{item.stats.avgWorkers}</b></div>
              <div><small>{t("wk.items")}</small><b className="num">{t("wk.itemsValue", { complete: item.stats.itemsComplete, waiting: item.stats.itemsWaiting })}</b></div>
            </div>
            <p style={{ margin: 0, whiteSpace: "pre-line" }}>{ar ? item.summaryAr || item.summaryEn : item.summaryEn}</p>
            {highlights.length ? <ul className="wk-list">{highlights.map((line) => <li key={line}>{line}</li>)}</ul> : null}
            {risks ? <p className="wk-risks"><b>{t("wk.risks")}</b> {risks}</p> : null}
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              {t("wk.daily")}{" "}
              {item.reportIds.map((id, i) => <span key={id}>{i ? " · " : ""}<Link href={`/reports/${id}`}>{i + 1}</Link></span>)}
              {" · "}{t(item.source === "ai" ? "wk.byAi" : "wk.byTemplate")}
            </p>
            {item.status === "returned" && item.reviewNote ? <p className="wk-note"><b>{t("wk.returnNote")}</b> {item.reviewNote}</p> : null}
            {canApprove && item.status !== "approved" ? (
              <div className="hstack" style={{ justifyContent: "flex-end" }}>
                <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => { setReturning(item); setNote(""); }}>{t("wk.return")}</button>
                <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => void review(item, "approved")}>{t("wk.approve")}</button>
              </div>
            ) : null}
          </article>
        );
      })}
      <Modal open={returning !== null} title={t("wk.returnTitle")} onClose={() => setReturning(null)}>
        <form className="stack" onSubmit={(event) => { event.preventDefault(); if (returning) void review(returning, "returned", note); }}>
          <label className="field">
            <span className="label">{t("wk.returnNote")}</span>
            <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("wk.returnHint")} />
          </label>
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={() => setReturning(null)}>{t("btn.cancel")}</button>
            <button type="submit" className="btn btn--primary" disabled={busy || !note.trim()}>{t("wk.return")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
