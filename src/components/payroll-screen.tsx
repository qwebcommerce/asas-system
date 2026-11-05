"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { Modal, Toast } from "@/components/ui/overlay";

const rows = [
  { id: "mohammed", code: "ASAS-0142", bank: "QNB", account: "•••• 4471", basic: "14,000", allow: "3,500", deduct: "0", net: "17,500" },
  { id: "layla", code: "ASAS-0120", bank: "CBQ", account: "•••• 0932", basic: "11,000", allow: "2,500", deduct: "0", net: "13,500" },
  { id: "aisha", code: "ASAS-0108", bank: "QNB", account: "•••• 7810", basic: "12,500", allow: "2,800", deduct: "0", net: "15,300" },
  { id: "omar", code: "ASAS-0115", bank: "Doha Bank", account: "•••• 2205", basic: "5,500", allow: "1,200", deduct: "250", net: "6,450" },
  { id: "yousef", code: "ASAS-0191", bank: "QIB", account: "•••• 3364", basic: "13,000", allow: "3,000", deduct: "400", net: "15,600" },
  { id: "reem", code: "ASAS-0131", bank: "QNB", account: "•••• 5528", basic: "15,000", allow: "3,500", deduct: "0", net: "18,500" },
] as const;

export function PayrollScreen() {
  const t = useTranslations();
  const [method, setMethod] = useState<"bank" | "cash">("bank");
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);

  return (
    <AppShell title={t("pay.title")}>
      <div className="page-header">
        <div>
          <span className="eyebrow">{t("nav.payroll")}</span>
          <h2 className="page-title">{t("pay.title")}</h2>
          <p className="page-sub">{t("pay.sub")}</p>
        </div>
        <button type="button" className="btn btn--secondary">
          <Icon name="download" />
          {t("pay.wpsBtn")}
        </button>
      </div>
      <div className="card steps">
        <Step n={<Icon name="check" className="icon icon--sm" />} title={t("pay.s1")} detail={t("pay.s1s")} />
        <span className="step-line" />
        <Step n={<Icon name="check" className="icon icon--sm" />} title={t("pay.s2")} detail={t("pay.s2s")} />
        <span className="step-line" />
        <Step n={<Icon name="check" className="icon icon--sm" />} title={t("pay.s3")} detail={t("pay.s3s")} />
        <span className="step-line" />
        <div className="step step--current">
          <span className="n"><Icon name="wallet" className="icon icon--sm" /></span>
          <div>
            <b>{t("pay.s4")}</b>
            <small>{t("pay.s4s")}</small>
          </div>
        </div>
      </div>
      <div className="between">
        <div className="segmented">
          <button type="button" aria-pressed={method === "bank"} onClick={() => setMethod("bank")}>
            <Icon name="bank" className="icon icon--sm" /> {t("pay.bank")}
          </button>
          <button type="button" aria-pressed={method === "cash"} onClick={() => setMethod("cash")}>
            {t("pay.cash")}
          </button>
        </div>
      </div>
      {method === "bank" ? (
        <div className="card card--flush table-wrap">
          <table className="table table--cards">
            <thead>
              <tr>
                <th />
                <th>{t("col.empId")}</th>
                <th>{t("col.name")}</th>
                <th>{t("col.bank")}</th>
                <th>{t("col.account")}</th>
                <th className="end">{t("col.basic")}</th>
                <th className="end">{t("col.allow")}</th>
                <th className="end">{t("col.deduct")}</th>
                <th className="end">{t("col.net")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td data-label=""><input type="checkbox" defaultChecked aria-label={t(`person.${row.id}`)} /></td>
                  <td data-label={t("col.empId")} className="num muted"><bdi>{row.code}</bdi></td>
                  <td data-label={t("col.name")} className="strong">{t(`person.${row.id}`)}</td>
                  <td data-label={t("col.bank")}>{row.bank}</td>
                  <td data-label={t("col.account")} className="mono muted"><bdi>{row.account}</bdi></td>
                  <td data-label={t("col.basic")} className="num end"><bdi>{row.basic}</bdi></td>
                  <td data-label={t("col.allow")} className="num end"><bdi>{row.allow}</bdi></td>
                  <td data-label={t("col.deduct")} className="num end" style={{ color: row.deduct === "0" ? "var(--text-muted)" : "var(--danger)" }}>
                    <bdi>{row.deduct}</bdi>
                  </td>
                  <td data-label={t("col.net")} className="num end strong"><bdi>{row.net}</bdi></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <p>{t("pay.cash")}</p>
          <p className="muted">{t("pay.sub")}</p>
        </div>
      )}
      <div className="card between">
        <div className="hstack" style={{ marginInlineStart: "auto" }}>
          <div style={{ textAlign: "end" }}>
            <small className="muted" style={{ display: "block" }}>{t("pay.total44")}</small>
            <strong className="num" style={{ fontSize: 26, fontWeight: 300 }}>{t("sample.payTotal")}</strong>
          </div>
          <button type="button" className="btn btn--accent btn--lg" onClick={() => setOpen(true)}>
            <Icon name="send" />
            {t("pay.pay")}
          </button>
        </div>
      </div>
      <Modal open={open} title={t("pay.confirmT")} onClose={() => setOpen(false)}>
        <div className="card card--dark">
          <small style={{ color: "var(--steel)" }}>{t("pay.youPay")}</small>
          <div className="num" style={{ fontSize: 34, fontWeight: 300, color: "var(--champagne)" }}>{t("sample.payTotal")}</div>
          <small style={{ color: "var(--mist)" }}>{t("pay.to44")}</small>
        </div>
        <div>
          <div className="kv"><span>{t("pay.approvedBy")}</span><b>{t("sample.ceo")}</b></div>
          <div className="kv"><span>{t("pay.month")}</span><b>{t("pay.oct")}</b></div>
        </div>
        <label className="check"><input type="checkbox" defaultChecked /><span>{t("pay.wps")}</span></label>
        <label className="check"><input type="checkbox" defaultChecked /><span>{t("pay.slips")}</span></label>
        <div className="hstack" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>{t("btn.cancel")}</button>
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => {
              setOpen(false);
              setToast(true);
              window.setTimeout(() => setToast(false), 3000);
            }}
          >
            <Icon name="check" />
            {t("pay.confirm")}
          </button>
        </div>
      </Modal>
      <Toast open={toast} title={t("pay.doneT")} detail={t("pay.doneS")} />
    </AppShell>
  );
}

function Step({ n, title, detail }: { n: ReactNode; title: string; detail: string }) {
  return (
    <div className="step">
      <span className="n">{n}</span>
      <div>
        <b>{title}</b>
        <small>{detail}</small>
      </div>
    </div>
  );
}
