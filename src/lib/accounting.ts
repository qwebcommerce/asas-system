import { qatarToday } from "@/lib/hr";

export const billCategories = ["rental", "office", "project", "utilities", "materials", "transport", "other"] as const;

export const chequeDirections = ["in", "out"] as const;
export const chequeStatuses = ["inhand", "deposited", "cleared", "bounced"] as const;
export const ledgerAccounts = ["ar", "retention", "ap", "revenue", "expense", "received", "paid"] as const;

export type BillCategory = (typeof billCategories)[number];
export type ChequeDirection = (typeof chequeDirections)[number];
export type ChequeStatus = (typeof chequeStatuses)[number];
export type LedgerAccount = (typeof ledgerAccounts)[number];

export type Invoice = {
  id: string;
  number: string;
  clientEn: string;
  clientAr: string;
  projectEn: string;
  projectAr: string;
  contract: number;
  progressPct: number;
  retentionPct: number;
  received: number;
  issuedOn: string;
  dueOn: string;
  issued: boolean;
};

export type InvoiceInput = Omit<Invoice, "id" | "number">;

export type Bill = {
  id: string;
  supplierEn: string;
  supplierAr: string;
  category: BillCategory;
  projectEn: string;
  projectAr: string;
  reference: string;
  note: string;
  issuedOn: string;
  dueOn: string;
  amount: number;
  paid: number;
};

export type BillInput = Omit<Bill, "id">;

export type Cheque = {
  id: string;
  partyEn: string;
  partyAr: string;
  number: string;
  bank: string;
  amount: number;
  dueOn: string;
  direction: ChequeDirection;
  status: ChequeStatus;
};

export type ChequeInput = Omit<Cheque, "id">;

export type Budget = {
  id: string;
  projectEn: string;
  projectAr: string;
  approved: number;
  spent: number;
};

export type BudgetInput = Omit<Budget, "id">;

export type Expense = {
  id: string;
  vendorEn: string;
  vendorAr: string;
  category: BillCategory;
  projectEn: string;
  projectAr: string;
  reference: string;
  note: string;
  spentOn: string;
  dueOn: string;
  amount: number;
  paid: number;
};

export type ExpenseInput = Omit<Expense, "id">;

export type LedgerLine = {
  id: string;
  date: string;
  memo: string;
  account: LedgerAccount;
  debit: number;
  credit: number;
};

export function invoiceMath(contract: number, progressPct: number, retentionPct: number) {
  const billed = Math.round(contract * progressPct / 100);
  const retention = Math.round(billed * retentionPct / 100);
  return { billed, retention, net: billed - retention };
}

function whole(value: number, max = 100_000_000) {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

function named(en: string, ar: string) {
  return en.trim().length > 0 && ar.trim().length > 0;
}

function dated(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function invoiceProblem(input: InvoiceInput) {
  if (!named(input.clientEn, input.clientAr)) return "fin.needNames";
  if (!dated(input.issuedOn) || !dated(input.dueOn)) return "fin.needDates";
  if (!whole(input.progressPct, 100) || !whole(input.retentionPct, 100)) return "fin.badPercent";
  if (!whole(input.contract) || !whole(input.received)) return "fin.badAmount";
  if (input.issued && input.contract < 1) return "fin.needContract";
  if (!input.issued && input.received > 0) return "fin.receivedDraft";
  if (input.received > invoiceMath(input.contract, input.progressPct, input.retentionPct).net) return "fin.receivedHigh";
  return null;
}

function categoryProblem(category: BillCategory, projectEn: string, projectAr: string) {
  if (!billCategories.includes(category)) return "fin.needCategory";
  if (category === "project" && !named(projectEn, projectAr)) return "fin.needProject";
  return null;
}

export function billProblem(input: BillInput) {
  if (!named(input.supplierEn, input.supplierAr)) return "fin.needNames";
  const category = categoryProblem(input.category, input.projectEn, input.projectAr);
  if (category) return category;
  if (!dated(input.issuedOn) || !dated(input.dueOn)) return "fin.needDates";
  if (!whole(input.amount) || input.amount < 1 || !whole(input.paid)) return "fin.needAmount";
  if (input.paid > input.amount) return "fin.paidHigh";
  return null;
}

export function expenseProblem(input: ExpenseInput) {
  if (!named(input.vendorEn, input.vendorAr)) return "fin.needNames";
  const category = categoryProblem(input.category, input.projectEn, input.projectAr);
  if (category) return category;
  if (!dated(input.spentOn) || !dated(input.dueOn)) return "fin.needDates";
  if (!whole(input.amount) || input.amount < 1 || !whole(input.paid)) return "fin.needAmount";
  if (input.paid > input.amount) return "fin.paidHigh";
  return null;
}

export function invoiceState(invoice: Invoice, today = qatarToday()) {
  const { net } = invoiceMath(invoice.contract, invoice.progressPct, invoice.retentionPct);
  if (!invoice.issued) return "draft" as const;
  if (invoice.received >= net) return "paid" as const;
  if (invoice.dueOn < today) return "overdue" as const;
  if (invoice.received > 0) return "partial" as const;
  return "open" as const;
}

export function billState(bill: Bill, today = qatarToday()) {
  if (bill.paid >= bill.amount) return "paid" as const;
  if (bill.dueOn < today) return "overdue" as const;
  if (bill.paid > 0) return "partial" as const;
  return "open" as const;
}

export function owed(invoices: Invoice[]) {
  return invoices.reduce((sum, invoice) => {
    if (!invoice.issued) return sum;
    const { net } = invoiceMath(invoice.contract, invoice.progressPct, invoice.retentionPct);
    return sum + Math.max(0, net - invoice.received);
  }, 0);
}

export function payable(bills: Bill[], expenses: Expense[] = []) {
  return bills.reduce((sum, bill) => sum + Math.max(0, bill.amount - bill.paid), 0)
    + expenses.reduce((sum, expense) => sum + Math.max(0, expense.amount - expense.paid), 0);
}

export function monthProfit(invoices: Invoice[], bills: Bill[], expenses: Expense[], month: string) {
  const revenue = invoices.reduce((sum, invoice) => {
    if (!invoice.issued || !invoice.issuedOn.startsWith(month)) return sum;
    return sum + invoiceMath(invoice.contract, invoice.progressPct, invoice.retentionPct).billed;
  }, 0);
  const costs = bills.reduce((sum, bill) => sum + (bill.issuedOn.startsWith(month) ? bill.amount : 0), 0)
    + expenses.reduce((sum, expense) => sum + (expense.spentOn.startsWith(month) ? expense.amount : 0), 0);
  return { revenue, costs, profit: revenue - costs };
}

export function ledger(invoices: Invoice[], bills: Bill[], expenses: Expense[]) {
  const lines: LedgerLine[] = [];
  invoices.forEach((invoice) => {
    if (!invoice.issued) return;
    const math = invoiceMath(invoice.contract, invoice.progressPct, invoice.retentionPct);
    const memo = invoice.number;
    if (math.net > 0) lines.push({ id: `${invoice.id}:ar`, date: invoice.issuedOn, memo, account: "ar", debit: math.net, credit: 0 });
    if (math.retention > 0) lines.push({ id: `${invoice.id}:retention`, date: invoice.issuedOn, memo, account: "retention", debit: math.retention, credit: 0 });
    if (math.billed > 0) lines.push({ id: `${invoice.id}:revenue`, date: invoice.issuedOn, memo, account: "revenue", debit: 0, credit: math.billed });
    if (invoice.received > 0) {
      lines.push({ id: `${invoice.id}:received`, date: invoice.issuedOn, memo, account: "received", debit: invoice.received, credit: 0 });
      lines.push({ id: `${invoice.id}:ar-paid`, date: invoice.issuedOn, memo, account: "ar", debit: 0, credit: invoice.received });
    }
  });
  bills.forEach((bill) => {
    const memo = bill.reference || bill.supplierEn;
    if (bill.amount > 0) {
      lines.push({ id: `${bill.id}:expense`, date: bill.issuedOn, memo, account: "expense", debit: bill.amount, credit: 0 });
      lines.push({ id: `${bill.id}:ap`, date: bill.issuedOn, memo, account: "ap", debit: 0, credit: bill.amount });
    }
    if (bill.paid > 0) {
      lines.push({ id: `${bill.id}:ap-paid`, date: bill.issuedOn, memo, account: "ap", debit: bill.paid, credit: 0 });
      lines.push({ id: `${bill.id}:paid`, date: bill.issuedOn, memo, account: "paid", debit: 0, credit: bill.paid });
    }
  });
  expenses.forEach((expense) => {
    const memo = expense.vendorEn;
    lines.push({ id: `${expense.id}:expense`, date: expense.spentOn, memo, account: "expense", debit: expense.amount, credit: 0 });
    lines.push({ id: `${expense.id}:paid`, date: expense.spentOn, memo, account: "paid", debit: 0, credit: expense.amount });
  });
  return lines.sort((a, b) => b.date.localeCompare(a.date) || a.memo.localeCompare(b.memo));
}

export function shiftDate(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function weekdayIndex(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function partyName(record: { clientEn?: string; clientAr?: string; supplierEn?: string; supplierAr?: string; partyEn?: string; partyAr?: string; vendorEn?: string; vendorAr?: string; projectEn?: string; projectAr?: string }, locale: string) {
  const en = record.clientEn || record.supplierEn || record.partyEn || record.vendorEn || record.projectEn || "";
  const ar = record.clientAr || record.supplierAr || record.partyAr || record.vendorAr || record.projectAr || "";
  return locale === "ar" ? ar || en : en || ar;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function day(value: unknown) {
  return /^\d{4}-\d{2}-\d{2}$/.test(text(value)) ? text(value) : "";
}

function qar(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100_000_000 ? value : null;
}

function pct(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100 ? value : null;
}

export function mapInvoice(id: string, data: Record<string, unknown>): Invoice | null {
  const contract = qar(data.contract);
  const progressPct = pct(data.progressPct);
  const retentionPct = pct(data.retentionPct);
  const received = qar(data.received);
  const issuedOn = day(data.issuedOn);
  const dueOn = day(data.dueOn);
  if (contract === null || progressPct === null || retentionPct === null || received === null || !issuedOn || !dueOn || !text(data.number) || !text(data.clientEn) || !text(data.clientAr)) return null;
  const math = invoiceMath(contract, progressPct, retentionPct);
  if (received > math.net) return null;
  return {
    id,
    number: text(data.number),
    clientEn: text(data.clientEn),
    clientAr: text(data.clientAr),
    projectEn: text(data.projectEn),
    projectAr: text(data.projectAr),
    contract,
    progressPct,
    retentionPct,
    received,
    issuedOn,
    dueOn,
    issued: data.issued === true,
  };
}

export function mapBill(id: string, data: Record<string, unknown>): Bill | null {
  const amount = qar(data.amount);
  const paid = qar(data.paid);
  const issuedOn = day(data.issuedOn);
  const dueOn = day(data.dueOn);
  if (amount === null || paid === null || paid > amount || !issuedOn || !dueOn || !text(data.supplierEn) || !text(data.supplierAr)) return null;
  return {
    id,
    supplierEn: text(data.supplierEn),
    supplierAr: text(data.supplierAr),
    category: billCategory(data.category),
    projectEn: text(data.projectEn),
    projectAr: text(data.projectAr),
    reference: text(data.reference),
    note: text(data.note),
    issuedOn,
    dueOn,
    amount,
    paid,
  };
}

function billCategory(value: unknown): BillCategory {
  return billCategories.find((item) => item === value) ?? "other";
}

export function mapCheque(id: string, data: Record<string, unknown>): Cheque | null {
  const amount = qar(data.amount);
  const dueOn = day(data.dueOn);
  const direction = chequeDirections.find((item) => item === data.direction);
  const status = chequeStatuses.find((item) => item === data.status);
  if (amount === null || amount < 1 || !dueOn || !direction || !status || !text(data.partyEn) || !text(data.partyAr) || !text(data.number)) return null;
  return { id, partyEn: text(data.partyEn), partyAr: text(data.partyAr), number: text(data.number), bank: text(data.bank), amount, dueOn, direction, status };
}

export function mapBudget(id: string, data: Record<string, unknown>): Budget | null {
  const approved = qar(data.approved);
  const spent = qar(data.spent);
  if (approved === null || spent === null || !text(data.projectEn) || !text(data.projectAr)) return null;
  return { id, projectEn: text(data.projectEn), projectAr: text(data.projectAr), approved, spent };
}

export function mapExpense(id: string, data: Record<string, unknown>): Expense | null {
  const amount = qar(data.amount);
  const spentOn = day(data.spentOn);
  const dueOn = day(data.dueOn) || spentOn;
  const paid = qar(data.paid) ?? amount;
  if (amount === null || paid === null || paid > amount || amount < 1 || !spentOn || !dueOn || !text(data.vendorEn) || !text(data.vendorAr)) return null;
  return {
    id,
    vendorEn: text(data.vendorEn),
    vendorAr: text(data.vendorAr),
    category: billCategory(data.category),
    projectEn: text(data.projectEn),
    projectAr: text(data.projectAr),
    reference: text(data.reference),
    note: text(data.note),
    spentOn,
    dueOn,
    amount,
    paid,
  };
}
