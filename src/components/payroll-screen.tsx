"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { usePayroll } from "@/components/use-payroll";
import { Modal, Toast } from "@/components/ui/overlay";
import { currentMonthKey } from "@/lib/hr";
import { lineNet, payMethods, runTotals, type PayMethod, type PayrollLine, type PayrollRun, type PayrollStatus } from "@/lib/payroll";
import { approvePayrollRun, createPayrollRun, deletePayrollRun, payPayrollRun, reopenPayrollRun, updatePayrollRun } from "@/server/payroll";

export function PayrollScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { runs, ready, canView, canManage, canApprove } = usePayroll();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<PayrollLine[] | null>(null);
  const [method, setMethod] = useState<PayMethod>("cash");
  const [creating, setCreating] = useState(false);
  const [month, setMonth] = useState(currentMonthKey());
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);
  const editingMonth = useRef<string | null>(null);
  const run = runs.find((item) => item.id === selected) ?? null;
  const lines = draft ?? run?.lines ?? [];
  const editable = Boolean(run && run.status === "draft" && canManage);
  const visible = lines.filter((line) => line.method === method);
  const totals = runTotals(lines);

  useEffect(() => {
    if (!creating) return;
    setMonth(currentMonthKey());
  }, [creating]);

  useEffect(() => {
    if (selected && ready && !runs.some((item) => item.id === selected)) setSelected(null);
  }, [ready, runs, selected]);

  useEffect(() => {
    const current = runs.find((item) => item.id === selected) ?? null;
    if (!current) {
      editingMonth.current = null;
      setDraft(null);
      return;
    }
    if (editingMonth.current !== current.id) {
      editingMonth.current = current.id;
      setDraft(current.lines.map((line) => ({ ...line })));
      setMethod(current.lines.some((line) => line.method === "bank") ? "bank" : "cash");
      return;
    }
    if (current.status !== "draft") setDraft(current.lines.map((line) => ({ ...line })));
  }, [runs, selected]);

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 3000);
  }

  function updateLine(employeeId: string, patch: Partial<PayrollLine>) {
    setDraft((current) => (current ?? []).map((line) => line.employeeId === employeeId ? { ...line, ...patch } : line));
  }

  async function save() {
    if (!run || !draft) return;
    if (draft.some((line) => line.deduction > line.basic + line.allowance)) {
      setError(t("pay.invalidMoney"));
      return;
    }
    const result = await updatePayrollRun(await getToken(), run.id, draft);
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    setError("");
    notify(t("pay.saved"), formatMonth(run.month, locale));
  }

  async function act(action: (token: string, month: string) => Promise<{ ok: true; id?: string } | { ok: false; error: string }>, title: string, detail?: string) {
    if (!run) return;
    const result = await action(await getToken(), run.id);
    if (!result.ok) {
      setError(t(result.error));
      return;
    }
    setError("");
    setPaying(false);
    if (action === deletePayrollRun) setSelected(null);
    notify(title, detail ?? formatMonth(run.month, locale));
  }

  return (
    <AppShell title={t("nav.payroll")}>
      <div className="pay">
        <div className="page-header">
          <div>
            <span className="eyebrow">{t("nav.payroll")}</span>
            <h2 className="page-title">{run ? formatMonth(run.month, locale) : t("nav.payroll")}</h2>
            <p className="page-sub">{run ? t(`pay.${run.status}`) : canView && ready ? t("pay.runs", { count: runs.length }) : canView ? t("common.loading") : t("pay.forbidden")}</p>
          </div>
          <div className="hstack page-actions">
            {run ? (
              <button type="button" className="btn btn--secondary" onClick={() => setSelected(null)}>
                <Icon name="chevl" className="icon icon--flip" />
                {t("pay.back")}
              </button>
            ) : null}
            {run ? (
              <button type="button" className="btn btn--secondary" onClick={() => exportRun(run.month, lines)}>
                <Icon name="download" />
                {t("pay.export")}
              </button>
            ) : null}
            {!run && canManage ? (
              <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
                <Icon name="plus" />
                {t("pay.new")}
              </button>
            ) : null}
          </div>
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        {canView && run ? (
          <>
            <div className="card steps">
              <Step n={1} done={run.attendanceSent} current={run.status === "draft" && !run.attendanceSent} title={t("pay.s1")} detail={run.attendanceSent ? t("pay.s1done") : t("pay.s1wait")} />
              <span className="step-line" />
              <Step n={2} done title={t("pay.s2")} detail={t("pay.s2done")} />
              <span className="step-line" />
              <Step n={3} done={run.status !== "draft"} current={run.status === "draft" && run.attendanceSent} title={t("pay.s3")} detail={run.status === "draft" ? t("pay.s3wait") : t("pay.s3done")} />
              <span className="step-line" />
              <Step n={4} done={run.status === "paid"} current={run.status === "approved"} title={t("pay.s4")} detail={run.status === "paid" ? t("pay.s4done") : t("pay.s4wait")} />
            </div>
            <div className="segmented">
              {payMethods.map((item) => (
                <button key={item} type="button" aria-pressed={method === item} onClick={() => setMethod(item)}>
                  {item === "bank" ? <Icon name="bank" className="icon icon--sm" /> : null}
                  {t(item === "bank" ? "pay.bankMethod" : "pay.cashMethod")}
                  {" "}
                  <bdi className="num">{lines.filter((line) => line.method === item).length}</bdi>
                </button>
              ))}
            </div>
            <div className="card card--flush table-wrap">
              <table className="table table--cards">
                <thead>
                  <tr>
                    <th>{t("col.empId")}</th>
                    <th>{t("col.name")}</th>
                    <th className="end">{t("pay.absent")}</th>
                    <th className="end">{t("pay.late")}</th>
                    <th className="end">{t("col.basic")}</th>
                    <th className="end">{t("col.allow")}</th>
                    <th className="end">{t("col.deduct")}</th>
                    <th>{t("pay.method")}</th>
                    <th className="end">{t("col.net")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? <tr><td colSpan={9}>{t("pay.noLines")}</td></tr> : null}
                  {visible.map((line) => (
                    <tr key={line.employeeId}>
                      <td data-label={t("col.empId")} className="num muted"><bdi>{line.code}</bdi></td>
                      <td data-label={t("col.name")} className="strong">{line.name}</td>
                      <td data-label={t("pay.absent")} className="num end"><bdi>{line.absent}</bdi></td>
                      <td data-label={t("pay.late")} className="num end"><bdi>{line.late}</bdi></td>
                      <td data-label={t("col.basic")} className="num end"><bdi>{formatNumber(line.basic, locale)}</bdi></td>
                      <td data-label={t("col.allow")} className="num end">
                        {editable ? <Money value={line.allowance} onChange={(value) => updateLine(line.employeeId, { allowance: value })} /> : <bdi>{formatNumber(line.allowance, locale)}</bdi>}
                      </td>
                      <td data-label={t("col.deduct")} className="num end" style={{ color: line.deduction > 0 ? "var(--danger)" : undefined }}>
                        {editable ? <Money value={line.deduction} onChange={(value) => updateLine(line.employeeId, { deduction: value })} /> : <bdi>{formatNumber(line.deduction, locale)}</bdi>}
                      </td>
                      <td data-label={t("pay.method")}>
                        {editable ? (
                          <select className="select" value={line.method} onChange={(event) => updateLine(line.employeeId, { method: event.target.value as PayMethod })}>
                            <option value="bank">{t("pay.bankMethod")}</option>
                            <option value="cash">{t("pay.cashMethod")}</option>
                          </select>
                        ) : t(line.method === "bank" ? "pay.bankMethod" : "pay.cashMethod")}
                      </td>
                      <td data-label={t("col.net")} className="num end strong"><bdi>{formatNumber(lineNet(line), locale)}</bdi></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card between">
              <div className="hstack" style={{ flexWrap: "wrap" }}>
                <Total label={t("pay.bankMethod")} amount={totals.bank} locale={locale} />
                <Total label={t("pay.cashMethod")} amount={totals.cash} locale={locale} />
                <Total label={t("pay.total")} amount={totals.total} locale={locale} />
              </div>
              <div className="hstack">
                {canManage && run.status !== "paid" ? (
                  <button type="button" className="btn btn--ghost" onClick={() => void act(deletePayrollRun, t("pay.removed"))}>{t("us.delete")}</button>
                ) : null}
                {editable ? <button type="button" className="btn btn--secondary" onClick={() => void save()}>{t("set.save")}</button> : null}
                {canApprove && run.status === "draft" ? <button type="button" className="btn btn--primary" onClick={() => void act(approvePayrollRun, t("pay.approved"))}>{t("pay.approve")}</button> : null}
                {canApprove && run.status === "approved" ? <button type="button" className="btn btn--secondary" onClick={() => void act(reopenPayrollRun, t("pay.reopen"))}>{t("pay.reopen")}</button> : null}
                {canManage && run.status === "approved" ? (
                  <button type="button" className="btn btn--accent" onClick={() => setPaying(true)}>
                    <Icon name="send" />
                    {t("pay.markPaid")}
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
        {canView && !run ? (
          <div className="card card--flush table-wrap">
            <table className="table table--cards">
              <thead>
                <tr>
                  <th>{t("pay.month")}</th>
                  <th>{t("col.status")}</th>
                  <th className="end">{t("col.employee")}</th>
                  <th className="end">{t("pay.total")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? <tr><td colSpan={5}>{ready ? t("pay.empty") : t("common.loading")}</td></tr> : null}
                {runs.map((item) => {
                  const amount = runTotals(item.lines);
                  return (
                    <tr key={item.id}>
                      <td data-label={t("pay.month")} className="strong">{formatMonth(item.month, locale)}</td>
                      <td data-label={t("col.status")}><span className={`badge badge--${tone(item.status)}`}>{t(`pay.${item.status}`)}</span></td>
                      <td data-label={t("col.employee")} className="num end"><bdi>{item.lines.length}</bdi></td>
                      <td data-label={t("pay.total")} className="num end"><bdi>{formatQar(amount.total, locale)}</bdi></td>
                      <td className="end" data-label="">
                        <div className="hstack">
                          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setSelected(item.id)}>{t("pay.open")}</button>
                          {canManage && item.status !== "paid" ? (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => {
                                void (async () => {
                                  const result = await deletePayrollRun(await getToken(), item.id);
                                  if (!result.ok) setError(t(result.error));
                                  else {
                                    setError("");
                                    notify(t("pay.removed"), formatMonth(item.month, locale));
                                  }
                                })();
                              }}
                            >
                              {t("us.delete")}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        <Modal open={creating} title={t("pay.new")} onClose={() => setCreating(false)}>
          <label className="field">
            <span className="label">{t("pay.month")}</span>
            <input className="input" type="month" max={currentMonthKey()} value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={() => setCreating(false)}>{t("btn.cancel")}</button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                void (async () => {
                  const result = await createPayrollRun(await getToken(), month);
                  if (!result.ok) {
                    setError(t(result.error));
                    return;
                  }
                  setError("");
                  setCreating(false);
                  if (result.id) setSelected(result.id);
                  notify(t("pay.created"), formatMonth(month, locale));
                })();
              }}
            >
              {t("pay.new")}
            </button>
          </div>
        </Modal>
        <Modal open={paying} title={t("pay.confirmT")} onClose={() => setPaying(false)}>
          <div className="card card--dark">
            <small style={{ color: "var(--steel)" }}>{t("pay.youPay")}</small>
            <div className="num" style={{ fontSize: 34, fontWeight: 300, color: "var(--champagne)" }}>{formatQar(totals.total, locale)}</div>
            <small style={{ color: "var(--mist)" }}>{run ? formatMonth(run.month, locale) : ""}</small>
          </div>
          <p className="muted">{t("pay.payNote")}</p>
          <div className="hstack" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn--ghost" onClick={() => setPaying(false)}>{t("btn.cancel")}</button>
            <button type="button" className="btn btn--accent" onClick={() => void act(payPayrollRun, t("pay.paidT"), t("pay.paidS"))}>
              <Icon name="check" />
              {t("pay.confirm")}
            </button>
          </div>
        </Modal>
        <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
      </div>
    </AppShell>
  );
}

function Step({ n, title, detail, done = false, current = false }: { n: number; title: string; detail: string; done?: boolean; current?: boolean }) {
  return (
    <div className={`step${current ? " step--current" : ""}`}>
      <span className="n">{done ? <Icon name="check" className="icon icon--sm" /> : n}</span>
      <div>
        <b>{title}</b>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function Money({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      className="input num"
      type="number"
      min={0}
      step={1}
      value={value}
      onChange={(event) => {
        const next = event.target.value === "" ? 0 : Number(event.target.value);
        if (Number.isInteger(next) && next >= 0 && next <= 1_000_000) onChange(next);
      }}
    />
  );
}

function Total({ label, amount, locale }: { label: string; amount: number; locale: string }) {
  return (
    <div>
      <small className="muted" style={{ display: "block" }}>{label}</small>
      <strong className="num"><bdi>{formatQar(amount, locale)}</bdi></strong>
    </div>
  );
}

function tone(status: PayrollStatus) {
  if (status === "paid") return "ok";
  if (status === "approved") return "info";
  return "neutral";
}

function formatMonth(month: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${month}-01T12:00:00+03:00`));
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { numberingSystem: "latn", maximumFractionDigits: 0 }).format(value);
}

function formatQar(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "QAR", numberingSystem: "latn", maximumFractionDigits: 0 }).format(amount);
}

function exportRun(month: string, lines: PayrollLine[]) {
  const header = ["employeeId", "name", "basic", "allowance", "deduction", "net", "method", "absent", "late"];
  const rows = lines.map((line) => [line.code, line.name, line.basic, line.allowance, line.deduction, lineNet(line), line.method, line.absent, line.late]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `payroll-${month}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
