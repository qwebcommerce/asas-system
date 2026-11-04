"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/ui/overlay";

const filters = ["all", "paint", "gyp", "floor", "kitchen"] as const;
const lines = [
  { room: "areaMajlis", work: "workPaint", trade: "paint", l: "6.20", w: "4.80", h: "3.20", qty: "70.4", unit: "m²", rate: "28", total: "1,971" },
  { room: "areaMajlis", work: "workGypsum", trade: "gyp", l: "6.20", w: "4.80", h: "—", qty: "29.8", unit: "m²", rate: "95", total: "2,831" },
  { room: "areaDining", work: "workPaint", trade: "paint", l: "5.10", w: "4.20", h: "3.20", qty: "59.5", unit: "m²", rate: "28", total: "1,666" },
  { room: "areaBed1", work: "workPorcelain", trade: "floor", l: "4.60", w: "4.00", h: "—", qty: "18.4", unit: "m²", rate: "165", total: "3,036" },
  { room: "areaBed1", work: "workPaint", trade: "paint", l: "4.60", w: "4.00", h: "3.00", qty: "51.6", unit: "m²", rate: "28", total: "1,445" },
  { room: "areaCorridor", work: "workPorcelain", trade: "floor", l: "7.80", w: "1.60", h: "—", qty: "12.5", unit: "m²", rate: "165", total: "2,062" },
  { room: "areaKitchen", work: "workCabinets", trade: "kitchen", l: "4.20", w: "—", h: "—", qty: "4.2", unit: "lm", rate: "2,400", total: "10,080" },
] as const;

export function OfferScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const qar = (amount: string) => (locale === "ar" ? `${amount} ر.ق` : `QAR ${amount}`);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [toast, setToast] = useState(false);
  const visible = lines.filter((line) => filter === "all" || line.trade === filter);

  return (
    <AppShell title={t("off.title")}>
      <div className="page-header">
        <div>
          <h2 className="page-title">
            {t("off.title")} <span className="page-title num" style={{ fontSize: 22 }}>· <bdi>OF-2026-126</bdi></span>
          </h2>
          <p className="page-sub">{t("sample.offerSub")}</p>
        </div>
        <div className="steps">
          <div className="step">
            <span className="n"><Icon name="check" className="icon icon--sm" /></span>
            <b>{t("off.s1")}</b>
          </div>
          <span className="step-line" />
          <div className="step step--current"><span className="n">2</span><b>{t("off.s2")}</b></div>
          <span className="step-line" />
          <div className="step step--todo"><span className="n">3</span><b>{t("off.s3")}</b></div>
          <span className="step-line" />
          <div className="step step--todo"><span className="n">4</span><b>{t("off.s4")}</b></div>
        </div>
      </div>
      <div className="split split--wide">
        <div className="stack stack--sm">
          <div className="hstack">
            {filters.map((item) => (
              <button key={item} type="button" className="chip" aria-pressed={filter === item} onClick={() => setFilter(item)}>
                {t(`off.${item}`)}
              </button>
            ))}
          </div>
          <div className="card card--flush table-wrap">
            <table className="table table--cards">
              <thead>
                <tr>
                  <th>{t("col.room")}</th>
                  <th>{t("col.work")}</th>
                  <th>L m</th>
                  <th>W m</th>
                  <th>H m</th>
                  <th>{t("col.qty")}</th>
                  <th>{t("col.unit")}</th>
                  <th>{t("col.rate")}</th>
                  <th className="end">{t("col.total")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((line) => (
                  <tr key={`${line.room}-${line.work}-${line.qty}`}>
                    <td data-label={t("col.room")} className="strong">{t(`sample.${line.room}`)}</td>
                    <td data-label={t("col.work")}>{t(`sample.${line.work}`)}</td>
                    <td data-label="L" className="num"><bdi>{line.l}</bdi></td>
                    <td data-label="W" className="num"><bdi>{line.w}</bdi></td>
                    <td data-label="H" className="num"><bdi>{line.h}</bdi></td>
                    <td data-label={t("col.qty")} className="num strong"><bdi>{line.qty}</bdi></td>
                    <td data-label={t("col.unit")} className="muted"><bdi>{line.unit}</bdi></td>
                    <td data-label={t("col.rate")} className="num"><bdi>{line.rate}</bdi></td>
                    <td data-label={t("col.total")} className="num end strong"><bdi>{line.total}</bdi></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
              <button type="button" className="link">
                <Icon name="plus" className="icon icon--sm" />
                {t("off.addM")}
              </button>
            </div>
          </div>
          <div className="ai">
            <Icon name="spark" />
            <span>{t("off.ai")}</span>
          </div>
        </div>
        <div className="card stack stack--sm">
          <h3 className="card-title">{t("off.summary")}</h3>
          <div className="kv"><span>{t("off.client")}</span><span>{t("sample.clientMannai")}</span></div>
          <div className="kv"><span>{t("off.items")}</span><span className="num">{visible.length}</span></div>
          <div className="kv"><span>{t("off.subtotal")}</span><span className="num"><bdi>{qar("23,092")}</bdi></span></div>
          <div className="kv"><span>{t("off.discount")}</span><span className="num"><bdi>{locale === "ar" ? "− 1,155 ر.ق" : "− QAR 1,155"}</bdi></span></div>
          <div className="total">
            <b>{t("off.total")}</b>
            <strong className="num"><bdi>{qar("21,937")}</bdi></strong>
          </div>
          <small className="muted">{t("off.valid")}</small>
          <button type="button" className="btn btn--primary btn--block">
            <Icon name="eye" />
            {t("off.preview")}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ width: "100%" }}
            onClick={() => {
              setToast(true);
              window.setTimeout(() => setToast(false), 3000);
            }}
          >
            {t("btn.saveDraft")}
          </button>
        </div>
      </div>
      <Toast open={toast} title={t("btn.saveDraft")} detail={t("sample.draftSaved")} />
    </AppShell>
  );
}
