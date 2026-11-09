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
import { billCategories, billProblem, billState, invoiceMath, invoiceProblem, invoiceState, ledger, monthProfit, owed, partyName, payable, type Bill, type BillCategory, type BillInput, type Expense, type ExpenseInput, type Invoice, type InvoiceInput } from "@/lib/accounting";
import { currentMonthKey, qatarToday } from "@/lib/hr";
import { createBill, createInvoice, deleteAccountingRecord, updateBill, updateExpense, updateInvoice } from "@/server/accounting";

type Book = "invoices" | "bills" | "expenses";

export function AccountingScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const { getToken } = useAuth();
  const { invoices, bills, expenses, ready, canView, canManage } = useAccounting();
  const [tab, setTab] = useState("dash");
  const [editor, setEditor] = useState<{ book: Book; id: string | null } | null>(null);
  const [costCategory, setCostCategory] = useState<BillCategory | "all">("all");
  const [month, setMonth] = useState(currentMonthKey());
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null);
  const today = qatarToday();
  const openBills = bills.filter((bill) => billState(bill, today) !== "paid").length + expenses.filter((expense) => expense.paid < expense.amount).length;
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
    if (!result.ok) notify(t(result.error), detail);
    else notify(t("fin.removed"), detail);
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
              <button type="button" className="btn btn--secondary" onClick={() => setEditor({ book: "bills", id: null })}>
                <Icon name="plus" />
                {t("fin.billAdd")}
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setEditor({ book: "invoices", id: null })}>
                <Icon name="plus" />
                {t("acc.invoice")}
              </button>
            </div>
          ) : null}
        </div>
        {!canView && ready ? <p className="muted">{t("common.forbidden")}</p> : null}
        {canView ? (
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
                  <Kpi label={t("acc.k3")} value={formatQar(payable(bills, expenses), locale)} note={t("fin.billNote", { count: openBills })} />
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
                      <h3 className="card-title">{t("fin.spend")}</h3>
                      <p className="card-sub">{formatMonth(currentMonthKey(), locale)}</p>
                      {billCategories.every((category) => categorySpend(bills, expenses, currentMonthKey(), category) === 0) ? <p className="muted">{t("fin.noBills")}</p> : null}
                      {billCategories.map((category) => {
                        const total = categorySpend(bills, expenses, currentMonthKey(), category);
                        if (total === 0) return null;
                        return <div className="kv" key={category}><span>{t(`fin.cat.${category}`)}</span><b className="num"><bdi>{formatQar(total, locale)}</bdi></b></div>;
                      })}
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
                manage={canManage}
                onEdit={(id) => setEditor({ book: "invoices", id })}
                onDelete={(id) => {
                  const invoice = invoices.find((item) => item.id === id);
                  if (invoice) void remove("invoices", id, invoice.number);
                }}
              />
            ) : null}
            {tab === "bills" ? (
              <>
                <div className="between">
                  <select className="select" style={{ width: "auto" }} value={costCategory} onChange={(event) => setCostCategory(event.target.value as BillCategory | "all")}>
                    <option value="all">{t("fin.allCosts")}</option>
                    {billCategories.map((category) => <option key={category} value={category}>{t(`fin.cat.${category}`)}</option>)}
                  </select>
                  {canManage ? <button type="button" className="btn btn--primary" onClick={() => setEditor({ book: "bills", id: null })}><Icon name="plus" />{t("fin.billAdd")}</button> : null}
                </div>
                <BookTable
                  showCategory
                  manage={canManage}
                  empty={ready ? t("fin.noBills") : t("common.loading")}
                  rows={costRows(bills, expenses, costCategory, today, locale, t)}
                  onEdit={(id) => {
                    const source = id.slice(0, id.indexOf(":"));
                    const recordId = id.slice(id.indexOf(":") + 1);
                    if (source === "bills" || source === "expenses") setEditor({ book: source, id: recordId });
                  }}
                  onDelete={(id) => {
                    const source = id.slice(0, id.indexOf(":"));
                    const recordId = id.slice(id.indexOf(":") + 1);
                    if (source !== "bills" && source !== "expenses") return;
                    const record = source === "bills" ? bills.find((item) => item.id === recordId) : expenses.find((item) => item.id === recordId);
                    if (record) void remove(source, recordId, partyName(record, locale));
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
          expenses={expenses}
          onClose={() => setEditor(null)}
          onSaved={(detail) => {
            setEditor(null);
            notify(t("fin.saved"), detail);
          }}
          getToken={getToken}
        />
        <Toast open={Boolean(toast)} title={toast?.title ?? ""} detail={toast?.detail ?? ""} />
      </div>
    </AppShell>
  );
}

function BookTable({ rows, empty, onEdit, onDelete, showCategory = false, manage = false }: { rows: { id: string; title: string; meta: string; category?: string; status: string; tone: string; amount: string }[]; empty: string; onEdit: (id: string) => void; onDelete: (id: string) => void; showCategory?: boolean; manage?: boolean }) {
  const t = useTranslations();
  return (
    <div className="card card--flush table-wrap">
      <table className="table table--cards">
        <thead>
          <tr>
            <th>{t("col.name")}</th>
            {showCategory ? <th>{t("fin.category")}</th> : null}
            <th>{t("col.status")}</th>
            <th className="end">{t("col.net")}</th>
            {manage ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={(showCategory ? 4 : 3) + (manage ? 1 : 0)}>{empty}</td></tr> : null}
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label={t("col.name")}><b>{row.title}</b><small className="muted" style={{ display: "block" }}><bdi>{row.meta}</bdi></small></td>
              {showCategory ? <td data-label={t("fin.category")}>{row.category}</td> : null}
              <td data-label={t("col.status")}><span className={`badge badge--${row.tone}`}>{row.status}</span></td>
              <td data-label={t("col.net")} className="num end"><bdi>{row.amount}</bdi></td>
              {manage ? (
                <td className="end" data-label="">
                  <div className="hstack">
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => onEdit(row.id)}>{t("us.edit")}</button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDelete(row.id)}>{t("us.delete")}</button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordModal({ editor, invoices, bills, expenses, onClose, onSaved, getToken }: {
  editor: { book: Book; id: string | null } | null;
  invoices: Invoice[];
  bills: Bill[];
  expenses: Expense[];
  onClose: () => void;
  onSaved: (detail: string) => void;
  getToken: () => Promise<string>;
}) {
  const t = useTranslations();
  const title = !editor ? "" : t(editor.id ? `fin.edit.${editor.book}` : `fin.add.${editor.book}`);
  return (
    <Modal open={editor !== null} title={title} onClose={onClose}>
      {editor?.book === "invoices" ? <InvoiceForm record={invoices.find((item) => item.id === editor.id) ?? null} getToken={getToken} onClose={onClose} onSaved={onSaved} /> : null}
      {editor?.book === "bills" ? <BillForm source="bills" record={bills.find((item) => item.id === editor.id) ?? null} getToken={getToken} onClose={onClose} onSaved={onSaved} /> : null}
      {editor?.book === "expenses" ? <BillForm source="expenses" record={expenseAsBill(expenses.find((item) => item.id === editor.id))} getToken={getToken} onClose={onClose} onSaved={onSaved} /> : null}
    </Modal>
  );
}

function InvoiceForm({ record, getToken, onClose, onSaved }: FormProps<Invoice>) {
  const t = useTranslations();
  const locale = useLocale();
  const [form, setForm] = useState<InvoiceInput>(blankInvoice());
  const [error, setError] = useState("");
  useEffect(() => {
    setForm(record ? (({ id: _id, number: _number, ...input }) => input)(record) : blankInvoice());
    setError("");
  }, [record]);
  const math = invoiceMath(form.contract, form.progressPct, form.retentionPct);
  return (
    <form className="stack" onSubmit={(event) => {
      event.preventDefault();
      const problem = invoiceProblem(form);
      if (problem) {
        setError(t(problem));
        return;
      }
      void saveForm(record ? (token) => updateInvoice(token, record.id, form) : (token) => createInvoice(token, form), getToken, record?.number || form.clientEn, onSaved, setError, t);
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
      <FormError message={error} />
      <FormActions onClose={onClose} />
    </form>
  );
}

function BillForm({ source, record, getToken, onClose, onSaved }: FormProps<Bill> & { source: "bills" | "expenses" }) {
  const t = useTranslations();
  const [form, setForm] = useState<BillInput>(blankBill());
  const [error, setError] = useState("");
  useEffect(() => {
    setForm(record ? (({ id: _id, ...input }) => input)(record) : blankBill());
    setError("");
  }, [record]);
  return (
    <form className="stack" onSubmit={(event) => {
      event.preventDefault();
      const problem = billProblem(form);
      if (problem) {
        setError(t(problem));
        return;
      }
      const save = source === "expenses" && record
        ? (token: string) => updateExpense(token, record.id, expenseInput(form))
        : record
          ? (token: string) => updateBill(token, record.id, form)
          : (token: string) => createBill(token, form);
      void saveForm(save, getToken, form.supplierEn, onSaved, setError, t);
    }}>
      <div className="form-grid form-grid--2">
        <Field label={t("fin.category")}>
          <select className="select" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as BillCategory })}>
            {billCategories.map((category) => <option key={category} value={category}>{t(`fin.cat.${category}`)}</option>)}
          </select>
        </Field>
        <Text label={t("fin.reference")} value={form.reference} onChange={(reference) => setForm({ ...form, reference })} />
        <Text label={t("fin.supplier")} value={form.supplierEn} onChange={(supplierEn) => setForm({ ...form, supplierEn })} />
        <Text label={t("fin.supplierAr")} value={form.supplierAr} onChange={(supplierAr) => setForm({ ...form, supplierAr })} />
        <Text label={t("off.project")} value={form.projectEn} onChange={(projectEn) => setForm({ ...form, projectEn })} />
        <Text label={t("off.projectAr")} value={form.projectAr} onChange={(projectAr) => setForm({ ...form, projectAr })} />
        <NumberField label={t("fin.amount")} value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
        <NumberField label={t("fin.paidAmount")} value={form.paid} onChange={(paid) => setForm({ ...form, paid })} />
        <DateField label={t("fin.issuedOn")} value={form.issuedOn} onChange={(issuedOn) => setForm({ ...form, issuedOn })} />
        <DateField label={t("fin.dueOn")} value={form.dueOn} onChange={(dueOn) => setForm({ ...form, dueOn })} />
      </div>
      <Field label={t("fin.note")}><textarea className="textarea" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
      <FormError message={error} />
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

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <p style={{ color: "var(--danger)" }}>{message}</p>;
}

type FormProps<T> = {
  record: T | null;
  getToken: () => Promise<string>;
  onClose: () => void;
  onSaved: (detail: string) => void;
};

async function saveForm(action: (token: string) => Promise<{ ok: true; id?: string } | { ok: false; error: string }>, getToken: () => Promise<string>, detail: string, onSaved: (detail: string) => void, setError: (message: string) => void, t: (key: string) => string) {
  setError("");
  const result = await action(await getToken());
  if (!result.ok) setError(t(result.error));
  else onSaved(detail);
}

function blankInvoice(): InvoiceInput {
  const today = qatarToday();
  return { clientEn: "", clientAr: "", projectEn: "", projectAr: "", contract: 0, progressPct: 0, retentionPct: 5, received: 0, issuedOn: today, dueOn: today, issued: false };
}

function blankBill(): BillInput {
  const today = qatarToday();
  return { supplierEn: "", supplierAr: "", category: "office", projectEn: "", projectAr: "", reference: "", note: "", issuedOn: today, dueOn: today, amount: 0, paid: 0 };
}

function expenseAsBill(expense: Expense | undefined): Bill | null {
  if (!expense) return null;
  return {
    id: expense.id,
    supplierEn: expense.vendorEn,
    supplierAr: expense.vendorAr,
    category: expense.category,
    projectEn: expense.projectEn,
    projectAr: expense.projectAr,
    reference: expense.reference,
    note: expense.note,
    issuedOn: expense.spentOn,
    dueOn: expense.dueOn,
    amount: expense.amount,
    paid: expense.paid,
  };
}

function expenseInput(form: BillInput): ExpenseInput {
  return {
    vendorEn: form.supplierEn,
    vendorAr: form.supplierAr,
    category: form.category,
    projectEn: form.projectEn,
    projectAr: form.projectAr,
    reference: form.reference,
    note: form.note,
    spentOn: form.issuedOn,
    dueOn: form.dueOn,
    amount: form.amount,
    paid: form.paid,
  };
}

function categorySpend(bills: Bill[], expenses: Expense[], month: string, category: BillCategory) {
  return bills.reduce((sum, bill) => sum + (bill.category === category && bill.issuedOn.startsWith(month) ? bill.amount : 0), 0)
    + expenses.reduce((sum, expense) => sum + (expense.category === category && expense.spentOn.startsWith(month) ? expense.amount : 0), 0);
}

function costRows(bills: Bill[], expenses: Expense[], category: BillCategory | "all", today: string, locale: string, t: (key: string) => string) {
  return [
    ...bills.map((bill) => ({ source: "bills" as const, bill })),
    ...expenses.flatMap((expense) => {
      const bill = expenseAsBill(expense);
      return bill ? [{ source: "expenses" as const, bill }] : [];
    }),
  ]
    .filter((row) => category === "all" || row.bill.category === category)
    .sort((a, b) => b.bill.issuedOn.localeCompare(a.bill.issuedOn))
    .map((row) => {
      const state = billState(row.bill, today);
      const project = partyName({ projectEn: row.bill.projectEn, projectAr: row.bill.projectAr }, locale);
      const meta = [row.bill.reference, project, row.bill.note].filter(Boolean).join(" · ");
      return {
        id: `${row.source}:${row.bill.id}`,
        title: partyName(row.bill, locale),
        meta: meta || formatDay(row.bill.dueOn, locale),
        category: t(`fin.cat.${row.bill.category}`),
        status: t(`fin.${state}`),
        tone: tone(state),
        amount: formatQar(Math.max(0, row.bill.amount - row.bill.paid), locale),
      };
    });
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
