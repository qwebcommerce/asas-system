"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { Kpi } from "@/components/ui/card";
import { Tabs } from "@/components/ui/data";

const months = [
  { id: "jun", a: 124, b: 96 },
  { id: "jul", a: 140, b: 104 },
  { id: "aug", a: 110, b: 100 },
  { id: "sep", a: 156, b: 125 },
  { id: "oct", a: 168, b: 134 },
  { id: "nov", a: 24, b: 12 },
] as const;

export function AccountingScreen() {
  const t = useTranslations();
  const [tab, setTab] = useState("dash");

  return (
    <AppShell title={t("nav.accounting")}>
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("nav.accounting")}</span>
          <h2 className="page-title">{t("acc.hello")}</h2>
          <p className="page-sub">{t("acc.month")}</p>
        </div>
        <div className="hstack">
          <button type="button" className="btn btn--secondary">
            <Icon name="camera" />
            {t("acc.receipt")}
          </button>
          <button type="button" className="btn btn--primary">
            <Icon name="plus" />
            {t("acc.invoice")}
          </button>
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "dash", label: t("at.dash") },
          { id: "inv", label: t("at.inv") },
          { id: "bills", label: t("at.bills") },
          { id: "journal", label: t("at.journal") },
          { id: "reports", label: t("at.reports") },
        ]}
      />
      {tab === "dash" ? <Dashboard /> : null}
      {tab === "inv" ? (
        <div className="card">
          <div className="between">
            <b><bdi>{t("sample.invNo")}</bdi></b>
            <span className="num">{t("sample.invDetail")}</span>
          </div>
        </div>
      ) : null}
      {tab === "bills" ? (
        <div className="card">
          <div className="between">
            <b>{t("sample.clientGulf")}</b>
            <span className="num">{t("sample.cheque2")}</span>
          </div>
          <p className="muted">{t("acc.k3n")}</p>
        </div>
      ) : null}
      {tab === "journal" ? (
        <div className="card stack">
          <h3 className="card-title">{t("at.journal")}</h3>
          <div className="kv"><span>{t("sample.pnlRev")}</span><span className="num"><bdi>840,000</bdi></span></div>
          <div className="kv"><span>{t("sample.pnlCost")}</span><span className="num"><bdi>552,000</bdi></span></div>
          <p className="muted">{t("ai.note")}</p>
        </div>
      ) : null}
      {tab === "reports" ? (
        <div className="card stack">
          <h3 className="card-title">{t("acc.k4")}</h3>
          <div className="kv"><span>{t("sample.pnlRev")}</span></div>
          <div className="kv"><span>{t("sample.pnlCost")}</span></div>
          <div className="kv"><span>{t("sample.pnlGross")}</span></div>
          <div className="kv"><span>{t("sample.pnlOpex")}</span></div>
          <div className="total"><b>{t("sample.pnlNet")}</b></div>
        </div>
      ) : null}
    </AppShell>
  );
}

function Dashboard() {
  const t = useTranslations();
  const monthsLabel = months;
  return (
    <>
      <div className="grid-4">
        <Kpi label={t("acc.k1")} value={t("sample.cash")} note={t("acc.k1n")} />
        <Kpi label={t("acc.k2")} value={t("sample.owed")} note={t("acc.k2n")} noteTone="danger" />
        <Kpi label={t("acc.k3")} value={t("sample.owes")} note={t("acc.k3n")} />
        <Kpi label={t("acc.k4")} value={t("sample.profit")} note={t("acc.k4n")} dark />
      </div>
      <div className="split">
        <div className="card">
          <div className="between">
            <div>
              <h3 className="card-title">{t("acc.chart")}</h3>
              <p className="card-sub">{t("acc.chartS")}</p>
            </div>
            <div className="hstack">
              <span className="legend">{t("acc.inc")}</span>
              <span className="legend" style={{ ["--legend" as string]: "var(--silver)" }}>{t("acc.exp")}</span>
            </div>
          </div>
          <div className="bars">
            {monthsLabel.map((month) => (
              <div className="bar" key={month.id}>
                <div className="pair">
                  <i style={{ height: month.a }} />
                  <i style={{ height: month.b }} />
                </div>
                <span>{t(`m.${month.id}`)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <h3 className="card-title">{t("acc.cheques")}</h3>
            <Cheque name={t("sample.clientMannai")} detail={t("chq1")} amount={t("sample.cheque1")} tone="ok" label={t("chq.in")} />
            <Cheque name={t("sample.clientGulf")} detail={t("chq2")} amount={t("sample.cheque2")} tone="warn" label={t("chq.out")} />
            <Cheque name={t("sample.clientGypsum")} detail={t("chq3")} amount={t("sample.cheque3")} tone="warn" label={t("chq.out")} />
          </div>
          <div className="card">
            <h3 className="card-title">{t("acc.budgets")}</h3>
            <p className="card-sub">{t("acc.budgetsS")}</p>
            <Budget name={t("sample.projectWest")} value={t("sample.budgetWest")} width="100%" danger />
            <Budget name={t("sample.projectLusail")} value={t("sample.budgetLusail")} width="92%" />
            <Budget name={t("sample.projectWaab")} value={t("sample.budgetWaab")} width="71%" />
          </div>
        </div>
      </div>
    </>
  );
}

function Cheque({ name, detail, amount, tone, label }: { name: string; detail: string; amount: string; tone: string; label: string }) {
  return (
    <div className="list-row">
      <span className="tile-icon"><Icon name="cheque" className="icon icon--sm" /></span>
      <div className="grow">
        <b>{name}</b>
        <small>{detail}</small>
      </div>
      <div style={{ textAlign: "end" }}>
        <b className="num">{amount}</b>
        <span className={`badge badge--${tone}`}>{label}</span>
      </div>
    </div>
  );
}

function Budget({ name, value, width, danger = false }: { name: string; value: string; width: string; danger?: boolean }) {
  return (
    <div className="stack stack--sm" style={{ gap: 6, padding: "8px 0" }}>
      <div className="between">
        <b style={{ fontSize: 13.5 }}>{name}</b>
        <span className={`num ${danger ? "note--danger" : "muted"}`}>{value}</span>
      </div>
      <div className={`progress${danger ? " progress--danger" : ""}`}>
        <span style={{ width }} />
      </div>
    </div>
  );
}
