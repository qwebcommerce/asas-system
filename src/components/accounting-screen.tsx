"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/icon";
import { useAccounting } from "@/components/use-accounting";
import { Kpi } from "@/components/ui/card";
import { Tabs } from "@/components/ui/data";
import { Modal, Toast } from "@/components/ui/overlay";
import { billState, chequeStatuses, invoiceMath, invoiceState, ledger, monthProfit, owed, partyName, payable, shiftDate, type Bill, type BillInput, type Budget, type BudgetInput, type Cheque, type ChequeInput, type Expense, type ExpenseInput, type Invoice, type InvoiceInput } from "@/lib/accounting";
import { currentMonthKey, qatarToday } from "@/lib/hr";
import { createBill, createBudget, createCheque, createExpense, createInvoice, deleteAccountingRecord, updateBill, updateBudget, updateCheque, updateExpense, updateInvoice } from "@/server/accounting";

type Book = "invoices" | "bills" | "cheques" | "budgets" | "expenses";

export function AccountingScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { invoices, bills, cheques, budgets, expenses, ready, canManage } = useAccounting();
  const [tab, setTab] = useState("dash");
  const [editor, setEditor] = useState<{ book: Book; id: string | null } | null>(null);
  const [month, setMonth] = useState(currentMonthKey());
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);
  const today = qatarToday();
  const dueSoon = shiftDate(today, 6);
  const openBills = bills.filter((bill) => billState(bill, today) !== "paid");
  const overdue = invoices.filter((invoice) => invoiceState(invoice, today) === "overdue").length;
  const profit = monthProfit(invoices, bills, expenses, currentMonthKey());
  const lines = ledger(invoices, bills, expenses);
  const monthLines = lines.filter((line) => line.date.startsWith(month));
  const report = monthProfit(invoices, bills, expenses, month);

  function notify(title: string, detail: string) {
    setToast({ title, detail });
    window.setTimeout(() => setToast(null), 3000);
  }

  async function remove(book: Book, id: string, detail: string) {
    const result = await deleteAccountingRecord(await getToken(), book, id);
    if (!result.ok) setError(t(result.error));
    else {
      setError("");
      notify(t("fin.removed"), detail);
    }
  }

  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(currentMonthKey(), index - 5));
  const series = months.map((key) => monthProfit(invoices, bills, expenses, key));
  const peak = Math.max(1, ...series.flatMap((item) => [item.revenue, item.costs]));

  return (
    <AppShell title={t("nav.accounting")}>
      <div className="acc">
        <div className="page-header">
          <div>
            <span className="eyebrow">{t("nav.accounting")}</span>
            <h2 className="page-title">{t("nav.accounting")}</h2>
            <p className="page-sub">{ready ? formatMonth(currentMonthKey(), locale) : t("common.loading")}</p>
          </div>
          {canManage ? (
            <div className="hstack page-actions">
              <button type="button" className="btn btn--secondary" onClick={() => setEditor({ book: "expenses", id: null })}>
                <Icon name="camera" />
                {t("fin.expenseAdd")}
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setEditor({ book: "invoices", id: null })}>
                <Icon name="plus" />
                {t("acc.invoice")}
              </button>
            </div>
          ) : null}
        </div>
        {!canManage ? <p className="muted">{t("fin.forbidden")}</p> : null}
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        {canManage ? (
          <>
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
            {tab === "dash" ? (
              <>
                <div className="grid-4">
                  <Kpi label={t("fin.revenue")} value={formatQar(profit.revenue, locale)} note={formatMonth(currentMonthKey(), locale)} />
                  <Kpi label={t("acc.k2")} value={formatQar(owed(invoices), locale)} note={t("fin.overdueNote", { count: overdue })} noteTone={overdue ? "danger" : undefined} />
                  <Kpi label={t("acc.k3")} value={formatQar(payable(bills), locale)} note={t("fin.billNote", { count: openBills.length })} />
                  <Kpi label={t("fin.profit")} value={formatQar(profit.profit, locale)} note={formatMonth(currentMonthKey(), locale)} dark />
                </div>
                <div className="split">
                  <div className="card">
                    <div className="between">
                      <div>
                        <h3 className="card-title">{t("acc.chart")}</h3>
                        <p className="card-sub">{t("fin.chartS")}</p>
                      </div>
                      <div className="hstack">
                        <span className="legend">{t("acc.inc")}</span>
                        <span className="legend" style={{ ["--legend" as string]: "var(--silver)" }}>{t("acc.exp")}</span>
                      </div>
                    </div>
                    <div className="bars">
                      {months.map((key, index) => (
                        <div className="bar" key={key}>
                          <div className="pair">
                            <i style={{ height: Math.round(series[index].revenue / peak * 140) }} />
                            <i style={{ height: Math.round(series[index].costs / peak * 140) }} />
                          </div>
                          <span>{formatMonth(key, locale, "short")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="stack">
                    <div className="card">
                      <div className="between">
                        <h3 className="card-title">{t("acc.cheques")}</h3>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditor({ book: "cheques", id: null })}>{t("fin.chequeAdd")}</button>
                      </div>
                      {cheques.length === 0 ? <p className="muted">{t("fin.noCheques")}</p> : null}
                      {cheques.slice().sort((a, b) => a.dueOn.localeCompare(b.dueOn)).map((cheque) => (
                        <div className="list-row" key={cheque.id}>
                          <span className="tile-icon"><Icon name="cheque" className="icon icon--sm" /></span>
                          <div className="grow">
                            <b>{partyName(cheque, locale)}</b>
                            <small><bdi>{cheque.number}</bdi> · {formatDay(cheque.dueOn, locale)}{cheque.dueOn >= today && cheque.dueOn <= dueSoon && cheque.status !== "cleared" && cheque.status !== "bounced" ? ` · ${t("fin.dueWeek")}` : ""}</small>
                          </div>
                          <div style={{ textAlign: "end" }}>
                            <b className="num">{formatQar(cheque.amount, locale)}</b>
                            <span className={`badge badge--${cheque.direction === "in" ? "ok" : "warn"}`}>{t(cheque.direction === "in" ? "chq.in" : "chq.out")}</span>
                          </div>
                          <div className="hstack">
                            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditor({ book: "cheques", id: cheque.id })}>{t("us.edit")}</button>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void remove("cheques", cheque.id, cheque.number)}>{t("us.delete")}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="card">
                      <div className="between">
                        <div>
                          <h3 className="card-title">{t("acc.budgets")}</h3>
                          <p className="card-sub">{t("acc.budgetsS")}</p>
                        </div>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditor({ book: "budgets", id: null })}>{t("fin.budgetAdd")}</button>
                      </div>
                      {budgets.length === 0 ? <p className="muted">{t("fin.noBudgets")}</p> : null}
                      {budgets.map((budget) => {
                        const ratio = budget.approved === 0 ? 1 : budget.spent / budget.approved;
                        return (
                          <div key={budget.id} className="stack stack--sm" style={{ gap: 6, padding: "8px 0" }}>
                            <div className="between">
                              <b style={{ fontSize: 13.5 }}>{partyName(budget, locale)}</b>
                              <span className={`num ${ratio >= 1 ? "note--danger" : ratio >= 0.9 ? "note--warn" : "muted"}`}><bdi>{formatQar(budget.spent, locale)} / {formatQar(budget.approved, locale)}</bdi></span>
                            </div>
                            <div className={`progress${ratio >= 1 ? " progress--danger" : ""}`}>
                              <span style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }} />
                            </div>
                            <div className="hstack">
                              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditor({ book: "budgets", id: budget.id })}>{t("us.edit")}</button>
                              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void remove("budgets", budget.id, partyName(budget, locale))}>{t("us.delete")}</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="card">
                      <div className="between">
                        <h3 className="card-title">{t("fin.expenses")}</h3>
                        <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditor({ book: "expenses", id: null })}>{t("fin.expenseAdd")}</button>
                      </div>
                      {expenses.length === 0 ? <p className="muted">{t("fin.noExpenses")}</p> : null}
                      {expenses.slice().sort((a, b) => b.spentOn.localeCompare(a.spentOn)).map((expense) => (
                        <div className="list-row" key={expense.id}>
                          <div className="grow">
                            <b>{partyName(expense, locale)}</b>
                            <small>{formatDay(expense.spentOn, locale)}{expense.note ? ` · ${expense.note}` : ""}</small>
                          </div>
                          <b className="num">{formatQar(expense.amount, locale)}</b>
                          <div className="hstack">
                            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditor({ book: "expenses", id: expense.id })}>{t("us.edit")}</button>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void remove("expenses", expense.id, partyName(expense, locale))}>{t("us.delete")}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
            {tab === "inv" ? (
              <BookTable
                empty={ready ? t("fin.noInvoices") : t("common.loading")}
                rows={invoices.slice().sort((a, b) => b.number.localeCompare(a.number)).map((invoice) => {
                  const math = invoiceMath(invoice.contract, invoice.progressPct, invoice.retentionPct);
                  const state = invoiceState(invoice, today);
                  return {
                    id: invoice.id,
                    title: partyName(invoice, locale),
                    meta: invoice.number,
                    status: t(`fin.${state}`),
                    tone: tone(state),
                    amount: formatQar(math.net, locale),
                  };
                })}
                onEdit={(id) => setEditor({ book: "invoices", id })}
                onDelete={(id) => {
                  const invoice = invoices.find((item) => item.id === id);
                  if (invoice) void remove("invoices", id, invoice.number);
                }}
              />
            ) : null}
            {tab === "bills" ? (
              <>
                <div className="hstack"><button type="button" className="btn btn--primary" onClick={() => setEditor({ book: "bills", id: null })}><Icon name="plus" />{t("fin.billAdd")}</button></div>
                <BookTable
                  empty={ready ? t("fin.noBills") : t("common.loading")}
                  rows={bills.slice().sort((a, b) => b.issuedOn.localeCompare(a.issuedOn)).map((bill) => {
                    const state = billState(bill, today);
                    return { id: bill.id, title: partyName(bill, locale), meta: bill.reference || formatDay(bill.dueOn, locale), status: t(`fin.${state}`), tone: tone(state), amount: formatQar(Math.max(0, bill.amount - bill.paid), locale) };
                  })}
                  onEdit={(id) => setEditor({ book: "bills", id })}
                  onDelete={(id) => {
                    const bill = bills.find((item) => item.id === id);
                    if (bill) void remove("bills", id, partyName(bill, locale));
                  }}
                />
              </>
            ) : null}
            {tab === "journal" ? (
              <div className="card card--flush table-wrap">
                <table className="table table--cards">
                  <thead>
                    <tr>
                      <th>{t("rep.date")}</th>
                      <th>{t("fin.memo")}</th>
                      <th>{t("fin.account")}</th>
                      <th className="end">{t("fin.debit")}</th>
                      <th className="end">{t("fin.credit")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? <tr><td colSpan={5}>{ready ? t("fin.noLines") : t("common.loading")}</td></tr> : null}
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <td data-label={t("rep.date")} className="num">{formatDay(line.date, locale)}</td>
                        <td data-label={t("fin.memo")}><bdi>{line.memo}</bdi></td>
                        <td data-label={t("fin.account")}>{t(`fin.accounts.${line.account}`)}</td>
                        <td data-label={t("fin.debit")} className="num end">{line.debit ? formatQar(line.debit, locale) : ""}</td>
                        <td data-label={t("fin.credit")} className="num end">{line.credit ? formatQar(line.credit, locale) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {tab === "reports" ? (
              <div className="card stack">
                <label className="field">
                  <span className="label">{t("pay.month")}</span>
                  <input className="input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
                </label>
                <div className="kv"><span>{t("fin.pnlRevenue")}</span><b className="num"><bdi>{formatQar(report.revenue, locale)}</bdi></b></div>
                <div className="kv"><span>{t("fin.pnlExpense")}</span><b className="num"><bdi>{formatQar(report.costs, locale)}</bdi></b></div>
                <div className="kv"><span>{t("fin.pnlProfit")}</span><b className="num"><bdi>{formatQar(report.profit, locale)}</bdi></b></div>
                <p className="muted">{t("fin.lines", { count: monthLines.length })}</p>
              </div>
            ) : null}
          </>
        ) : null}
        <RecordModal
          editor={editor}
          invoices={invoices}
          bills={bills}
          cheques={cheques}
          budgets={budgets}
          expenses={expenses}
          onClose={() => setEditor(null)}
          onSaved={(detail) => {
            setEditor(null);
            setError("");
            notify(t("fin.saved"), detail);
          }}
          onError={(message) => setError(message)}
          getToken={getToken}
        />
        <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
      </div>
    </AppShell>
  );
}

function BookTable({ rows, empty, onEdit, onDelete }: { rows: { id: string; title: string; meta: string; status: string; tone: string; amount: string }[]; empty: string; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  const t = useTranslations();
  return (
    <div className="card card--flush table-wrap">
      <table className="table table--cards">
        <thead>
          <tr>
            <th>{t("col.name")}</th>
            <th>{t("col.status")}</th>
            <th className="end">{t("col.net")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={4}>{empty}</td></tr> : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label={t("col.name")}><b>{row.title}</b><small className="muted" style={{ display: "block" }}><bdi>{row.meta}</bdi></small></td>
              <td data-label={t("col.status")}><span className={`badge badge--${row.tone}`}>{row.status}</span></td>
              <td data-label={t("col.net")} className="num end"><bdi>{row.amount}</bdi></td>
              <td className="end" data-label="">
                <div className="hstack">
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => onEdit(row.id)}>{t("us.edit")}</button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(row.id)}>{t("us.delete")}</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordModal({ editor, invoices, bills, cheques, budgets, expenses, onClose, onSaved, onError, getToken }: {
  editor: { book: Book; id: string | null } | null;
  invoices: Invoice[];
  bills: Bill[];
  cheques: Cheque[];
  budgets: Budget[];
  expenses: Expense[];
  onClose: () => void;
  onSaved: (detail: string) => void;
  onError: (message: string) => void;
  getToken: () => Promise<string>;
}) {
  const t = useTranslations();
  const title = !editor ? "" : t(editor.id ? `fin.edit.${editor.book}` : `fin.add.${editor.book}`);
  return (
    <Modal open={editor !== null} title={title} onClose={onClose}>
      {editor?.book === "invoices" ? <InvoiceForm record={invoices.find((item) => item.id === editor.id) ?? null} getToken={getToken} onClose={onClose} onSaved={onSaved} onError={onError} /> : null}
      {editor?.book === "bills" ? <BillForm record={bills.find((item) => item.id === editor.id) ?? null} getToken={getToken} onClose={onClose} onSaved={onSaved} onError={onError} /> : null}
      {editor?.book === "cheques" ? <ChequeForm record={cheques.find((item) => item.id === editor.id) ?? null} getToken={getToken} onClose={onClose} onSaved={onSaved} onError={onError} /> : null}
      {editor?.book === "budgets" ? <BudgetForm record={budgets.find((item) => item.id === editor.id) ?? null} getToken={getToken} onClose={onClose} onSaved={onSaved} onError={onError} /> : null}
      {editor?.book === "expenses" ? <ExpenseForm record={expenses.find((item) => item.id === editor.id) ?? null} getToken={getToken} onClose={onClose} onSaved={onSaved} onError={onError} /> : null}
    </Modal>
  );
}

function InvoiceForm({ record, getToken, onClose, onSaved, onError }: FormProps<Invoice>) {
  const t = useTranslations();
  const locale = useLocale();
  const [form, setForm] = useState<InvoiceInput>(blankInvoice());
  useEffect(() => {
    setForm(record ? (({ id: _id, number: _number, ...input }) => input)(record) : blankInvoice());
  }, [record]);
  const math = invoiceMath(form.contract, form.progressPct, form.retentionPct);
  return (
    <form className="stack" onSubmit={(event) => {
      event.preventDefault();
      void saveForm(record ? (token) => updateInvoice(token, record.id, form) : (token) => createInvoice(token, form), getToken, record?.number || form.clientEn, onSaved, onError, t);
    }}>
      <div className="form-grid form-grid--2">
        <Text label={t("off.client")} value={form.clientEn} onChange={(clientEn) => setForm({ ...form, clientEn })} />
        <Text label={t("off.clientAr")} value={form.clientAr} onChange={(clientAr) => setForm({ ...form, clientAr })} />
        <Text label={t("off.project")} value={form.projectEn} onChange={(projectEn) => setForm({ ...form, projectEn })} />
        <Text label={t("off.projectAr")} value={form.projectAr} onChange={(projectAr) => setForm({ ...form, projectAr })} />
        <NumberField label={t("fin.contract")} value={form.contract} onChange={(contract) => setForm({ ...form, contract })} />
        <NumberField label={t("fin.progress")} value={form.progressPct} max={100} onChange={(progressPct) => setForm({ ...form, progressPct })} />
        <NumberField label={t("fin.retention")} value={form.retentionPct} max={100} onChange={(retentionPct) => setForm({ ...form, retentionPct })} />
        <NumberField label={t("fin.received")} value={form.received} onChange={(received) => setForm({ ...form, received })} />
        <DateField label={t("fin.issuedOn")} value={form.issuedOn} onChange={(issuedOn) => setForm({ ...form, issuedOn })} />
        <DateField label={t("fin.dueOn")} value={form.dueOn} onChange={(dueOn) => setForm({ ...form, dueOn })} />
      </div>
      <p className="muted"><bdi>{t("fin.billed")} {formatQar(math.billed, locale)} · {t("fin.retentionAmt")} {formatQar(math.retention, locale)} · {t("fin.net")} {formatQar(math.net, locale)}</bdi></p>
      <label className="check"><input type="checkbox" checked={form.issued} onChange={(event) => setForm({ ...form, issued: event.target.checked, received: event.target.checked ? form.received : 0 })} /><span>{t("fin.issued")}</span></label>
      <FormActions onClose={onClose} />
    </form>
  );
}

function BillForm({ record, getToken, onClose, onSaved, onError }: FormProps<Bill>) {
  const t = useTranslations();
  const [form, setForm] = useState<BillInput>(blankBill());
  useEffect(() => {
    setForm(record ? (({ id: _id, ...input }) => input)(record) : blankBill());
  }, [record]);
  return (
    <form className="stack" onSubmit={(event) => {
      event.preventDefault();
      void saveForm(record ? (token) => updateBill(token, record.id, form) : (token) => createBill(token, form), getToken, form.supplierEn, onSaved, onError, t);
    }}>
      <div className="form-grid form-grid--2">
        <Text label={t("fin.supplier")} value={form.supplierEn} onChange={(supplierEn) => setForm({ ...form, supplierEn })} />
        <Text label={t("fin.supplierAr")} value={form.supplierAr} onChange={(supplierAr) => setForm({ ...form, supplierAr })} />
        <Text label={t("fin.reference")} value={form.reference} onChange={(reference) => setForm({ ...form, reference })} />
        <NumberField label={t("fin.amount")} value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
        <NumberField label={t("fin.paidAmount")} value={form.paid} onChange={(paid) => setForm({ ...form, paid })} />
        <DateField label={t("fin.issuedOn")} value={form.issuedOn} onChange={(issuedOn) => setForm({ ...form, issuedOn })} />
        <DateField label={t("fin.dueOn")} value={form.dueOn} onChange={(dueOn) => setForm({ ...form, dueOn })} />
      </div>
      <FormActions onClose={onClose} />
    </form>
  );
}

function ChequeForm({ record, getToken, onClose, onSaved, onError }: FormProps<Cheque>) {
  const t = useTranslations();
  const [form, setForm] = useState<ChequeInput>(blankCheque());
  useEffect(() => {
    setForm(record ? (({ id: _id, ...input }) => input)(record) : blankCheque());
  }, [record]);
  return (
    <form className="stack" onSubmit={(event) => {
      event.preventDefault();
      void saveForm(record ? (token) => updateCheque(token, record.id, form) : (token) => createCheque(token, form), getToken, form.number, onSaved, onError, t);
    }}>
      <div className="form-grid form-grid--2">
        <Text label={t("fin.party")} value={form.partyEn} onChange={(partyEn) => setForm({ ...form, partyEn })} />
        <Text label={t("fin.partyAr")} value={form.partyAr} onChange={(partyAr) => setForm({ ...form, partyAr })} />
        <Text label={t("fin.chequeNo")} value={form.number} onChange={(number) => setForm({ ...form, number })} />
        <Text label={t("col.bank")} value={form.bank} onChange={(bank) => setForm({ ...form, bank })} />
        <NumberField label={t("fin.amount")} value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
        <DateField label={t("fin.dueOn")} value={form.dueOn} onChange={(dueOn) => setForm({ ...form, dueOn })} />
        <Field label={t("fin.direction")}>
          <select className="select" value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value as ChequeInput["direction"] })}>
            <option value="in">{t("chq.in")}</option>
            <option value="out">{t("chq.out")}</option>
          </select>
        </Field>
        <Field label={t("col.status")}>
          <select className="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ChequeInput["status"] })}>
            {chequeStatuses.map((status) => <option key={status} value={status}>{t(`fin.${status}`)}</option>)}
          </select>
        </Field>
      </div>
      <FormActions onClose={onClose} />
    </form>
  );
}

function BudgetForm({ record, getToken, onClose, onSaved, onError }: FormProps<Budget>) {
  const t = useTranslations();
  const [form, setForm] = useState<BudgetInput>(blankBudget());
  useEffect(() => {
    setForm(record ? (({ id: _id, ...input }) => input)(record) : blankBudget());
  }, [record]);
  return (
    <form className="stack" onSubmit={(event) => {
      event.preventDefault();
      void saveForm(record ? (token) => updateBudget(token, record.id, form) : (token) => createBudget(token, form), getToken, form.projectEn, onSaved, onError, t);
    }}>
      <div className="form-grid form-grid--2">
        <Text label={t("off.project")} value={form.projectEn} onChange={(projectEn) => setForm({ ...form, projectEn })} />
        <Text label={t("off.projectAr")} value={form.projectAr} onChange={(projectAr) => setForm({ ...form, projectAr })} />
        <NumberField label={t("fin.approved")} value={form.approved} onChange={(approved) => setForm({ ...form, approved })} />
        <NumberField label={t("fin.spent")} value={form.spent} onChange={(spent) => setForm({ ...form, spent })} />
      </div>
      <FormActions onClose={onClose} />
    </form>
  );
}

function ExpenseForm({ record, getToken, onClose, onSaved, onError }: FormProps<Expense>) {
  const t = useTranslations();
  const [form, setForm] = useState<ExpenseInput>(blankExpense());
  useEffect(() => {
    setForm(record ? (({ id: _id, ...input }) => input)(record) : blankExpense());
  }, [record]);
  return (
    <form className="stack" onSubmit={(event) => {
      event.preventDefault();
      void saveForm(record ? (token) => updateExpense(token, record.id, form) : (token) => createExpense(token, form), getToken, form.vendorEn, onSaved, onError, t);
    }}>
      <div className="form-grid form-grid--2">
        <Text label={t("fin.vendor")} value={form.vendorEn} onChange={(vendorEn) => setForm({ ...form, vendorEn })} />
        <Text label={t("fin.vendorAr")} value={form.vendorAr} onChange={(vendorAr) => setForm({ ...form, vendorAr })} />
        <DateField label={t("rep.date")} value={form.spentOn} onChange={(spentOn) => setForm({ ...form, spentOn })} />
        <NumberField label={t("fin.amount")} value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
      </div>
      <Field label={t("fin.note")}><textarea className="textarea" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
      <FormActions onClose={onClose} />
    </form>
  );
}

function FormActions({ onClose }: { onClose: () => void }) {
  const t = useTranslations();
  return (
    <div className="hstack" style={{ justifyContent: "flex-end" }}>
      <button type="button" className="btn btn--ghost" onClick={onClose}>{t("btn.cancel")}</button>
      <button type="submit" className="btn btn--primary">{t("set.save")}</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span className="label">{label}</span>{children}</label>;
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><input className="input" value={value} onChange={(event) => onChange(event.target.value)} /></Field>;
}

function NumberField({ label, value, max = 100_000_000, onChange }: { label: string; value: number; max?: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <input className="input num" type="number" min={0} max={max} step={1} value={value} onChange={(event) => {
        const next = event.target.value === "" ? 0 : Number(event.target.value);
        if (Number.isInteger(next) && next >= 0 && next <= max) onChange(next);
      }} />
    </Field>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><input className="input" type="date" value={value} onChange={(event) => onChange(event.target.value)} /></Field>;
}

type FormProps<T> = {
  record: T | null;
  getToken: () => Promise<string>;
  onClose: () => void;
  onSaved: (detail: string) => void;
  onError: (message: string) => void;
};

async function saveForm(action: (token: string) => Promise<{ ok: true; id?: string } | { ok: false; error: string }>, getToken: () => Promise<string>, detail: string, onSaved: (detail: string) => void, onError: (message: string) => void, t: (key: string) => string) {
  const result = await action(await getToken());
  if (!result.ok) onError(t(result.error));
  else onSaved(detail);
}

function blankInvoice(): InvoiceInput {
  const today = qatarToday();
  return { clientEn: "", clientAr: "", projectEn: "", projectAr: "", contract: 0, progressPct: 0, retentionPct: 5, received: 0, issuedOn: today, dueOn: today, issued: false };
}

function blankBill(): BillInput {
  const today = qatarToday();
  return { supplierEn: "", supplierAr: "", reference: "", issuedOn: today, dueOn: today, amount: 0, paid: 0 };
}

function blankCheque(): ChequeInput {
  return { partyEn: "", partyAr: "", number: "", bank: "", amount: 0, dueOn: qatarToday(), direction: "in", status: "inhand" };
}

function blankBudget(): BudgetInput {
  return { projectEn: "", projectAr: "", approved: 0, spent: 0 };
}

function blankExpense(): ExpenseInput {
  return { vendorEn: "", vendorAr: "", spentOn: qatarToday(), amount: 0, note: "" };
}

function tone(status: string) {
  if (status === "paid") return "ok";
  if (status === "overdue") return "danger";
  if (status === "partial") return "warn";
  if (status === "open") return "info";
  return "neutral";
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7);
}

function formatMonth(month: string, locale: string, style: "long" | "short" = "long") {
  return new Intl.DateTimeFormat(locale, { month: style, year: style === "long" ? "numeric" : undefined, timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${month}-01T12:00:00+03:00`));
}

function formatDay(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Asia/Qatar", numberingSystem: "latn" }).format(new Date(`${value}T12:00:00+03:00`));
}

function formatQar(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "QAR", numberingSystem: "latn", maximumFractionDigits: 0 }).format(amount);
}
