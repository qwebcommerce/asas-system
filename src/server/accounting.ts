"use server";

import { FieldValue } from "firebase-admin/firestore";
import { chequeDirections, chequeStatuses, invoiceMath, type BillInput, type BudgetInput, type ChequeInput, type ExpenseInput, type InvoiceInput } from "@/lib/accounting";
import type { ActionResult } from "@/lib/directory";
import { qatarToday } from "@/lib/hr";
import { adminDb } from "@/lib/firebase-admin";
import { actor, audit, canManageAccounting } from "@/server/session";

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

function day(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function qar(value: number, minimum = 0) {
  return Number.isInteger(value) && value >= minimum && value <= 100_000_000 ? value : null;
}

function pct(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 100 ? value : null;
}

async function manager(idToken: string) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  if (!canManageAccounting(who.role)) return { error: "fin.forbidden" as const };
  return who;
}

function cleanInvoice(input: InvoiceInput): InvoiceInput | null {
  const clientEn = clip(input.clientEn, 160);
  const clientAr = clip(input.clientAr, 160);
  const projectEn = clip(input.projectEn, 160);
  const projectAr = clip(input.projectAr, 160);
  const contract = qar(input.contract, input.issued ? 1 : 0);
  const progressPct = pct(input.progressPct);
  const retentionPct = pct(input.retentionPct);
  const issuedOn = day(input.issuedOn);
  const dueOn = day(input.dueOn);
  if (!clientEn || !clientAr || contract === null || progressPct === null || retentionPct === null || !issuedOn || !dueOn) return null;
  const received = qar(input.received);
  if (received === null) return null;
  const math = invoiceMath(contract, progressPct, retentionPct);
  if (received > math.net || (!input.issued && received > 0)) return null;
  return { clientEn, clientAr, projectEn, projectAr, contract, progressPct, retentionPct, received, issuedOn, dueOn, issued: input.issued === true };
}

function cleanBill(input: BillInput): BillInput | null {
  const supplierEn = clip(input.supplierEn, 160);
  const supplierAr = clip(input.supplierAr, 160);
  const amount = qar(input.amount, 1);
  const paid = qar(input.paid);
  const issuedOn = day(input.issuedOn);
  const dueOn = day(input.dueOn);
  if (!supplierEn || !supplierAr || amount === null || paid === null || paid > amount || !issuedOn || !dueOn) return null;
  return { supplierEn, supplierAr, reference: clip(input.reference, 80), issuedOn, dueOn, amount, paid };
}

function cleanCheque(input: ChequeInput): ChequeInput | null {
  const partyEn = clip(input.partyEn, 160);
  const partyAr = clip(input.partyAr, 160);
  const number = clip(input.number, 40);
  const amount = qar(input.amount, 1);
  const dueOn = day(input.dueOn);
  if (!partyEn || !partyAr || !number || amount === null || !dueOn) return null;
  if (!chequeDirections.includes(input.direction) || !chequeStatuses.includes(input.status)) return null;
  return { partyEn, partyAr, number, bank: clip(input.bank, 80), amount, dueOn, direction: input.direction, status: input.status };
}

function cleanBudget(input: BudgetInput): BudgetInput | null {
  const projectEn = clip(input.projectEn, 160);
  const projectAr = clip(input.projectAr, 160);
  const approved = qar(input.approved, 1);
  const spent = qar(input.spent);
  if (!projectEn || !projectAr || approved === null || spent === null) return null;
  return { projectEn, projectAr, approved, spent };
}

function cleanExpense(input: ExpenseInput): ExpenseInput | null {
  const vendorEn = clip(input.vendorEn, 160);
  const vendorAr = clip(input.vendorAr, 160);
  const amount = qar(input.amount, 1);
  const spentOn = day(input.spentOn);
  if (!vendorEn || !vendorAr || amount === null || !spentOn) return null;
  return { vendorEn, vendorAr, spentOn, amount, note: clip(input.note, 400) };
}

async function nextInvoiceNumber() {
  const year = qatarToday().slice(0, 4);
  const prefix = `INV-${year}-`;
  const existing = await adminDb().collection("invoices").get();
  const max = existing.docs.reduce((highest, item) => {
    const number = typeof item.data().number === "string" ? item.data().number : "";
    if (!number.startsWith(prefix)) return highest;
    const sequence = Number(number.slice(prefix.length));
    return Number.isInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

async function saveNew(collection: string, who: string, data: object, detail: string) {
  const ref = await adminDb().collection(collection).add({ ...data, createdBy: who, createdAt: FieldValue.serverTimestamp() });
  await audit(`${collection}.create`, who, ref.id, detail);
  return ref.id;
}

export async function createInvoice(idToken: string, input: InvoiceInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const invoice = cleanInvoice(input);
    if (!invoice) return { ok: false, error: "fin.invalid" };
    const number = await nextInvoiceNumber();
    const id = await saveNew("invoices", who.uid, { ...invoice, number }, number);
    return { ok: true, id };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateInvoice(idToken: string, invoiceId: string, input: InvoiceInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const invoice = cleanInvoice(input);
    if (!invoice) return { ok: false, error: "fin.invalid" };
    const ref = adminDb().collection("invoices").doc(invoiceId);
    if (!(await ref.get()).exists) return { ok: false, error: "fin.invalid" };
    await ref.update({ ...invoice, updatedAt: FieldValue.serverTimestamp() });
    await audit("invoices.update", who.uid, invoiceId, invoice.clientEn);
    return { ok: true, id: invoiceId };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function createBill(idToken: string, input: BillInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const bill = cleanBill(input);
    if (!bill) return { ok: false, error: "fin.invalid" };
    const id = await saveNew("bills", who.uid, bill, bill.supplierEn);
    return { ok: true, id };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateBill(idToken: string, billId: string, input: BillInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const bill = cleanBill(input);
    if (!bill) return { ok: false, error: "fin.invalid" };
    const ref = adminDb().collection("bills").doc(billId);
    if (!(await ref.get()).exists) return { ok: false, error: "fin.invalid" };
    await ref.update({ ...bill, updatedAt: FieldValue.serverTimestamp() });
    await audit("bills.update", who.uid, billId, bill.supplierEn);
    return { ok: true, id: billId };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function createCheque(idToken: string, input: ChequeInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const cheque = cleanCheque(input);
    if (!cheque) return { ok: false, error: "fin.invalid" };
    const id = await saveNew("cheques", who.uid, cheque, cheque.number);
    return { ok: true, id };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateCheque(idToken: string, chequeId: string, input: ChequeInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const cheque = cleanCheque(input);
    if (!cheque) return { ok: false, error: "fin.invalid" };
    const ref = adminDb().collection("cheques").doc(chequeId);
    if (!(await ref.get()).exists) return { ok: false, error: "fin.invalid" };
    await ref.update({ ...cheque, updatedAt: FieldValue.serverTimestamp() });
    await audit("cheques.update", who.uid, chequeId, cheque.number);
    return { ok: true, id: chequeId };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function createBudget(idToken: string, input: BudgetInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const budget = cleanBudget(input);
    if (!budget) return { ok: false, error: "fin.invalid" };
    const id = await saveNew("budgets", who.uid, budget, budget.projectEn);
    return { ok: true, id };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateBudget(idToken: string, budgetId: string, input: BudgetInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const budget = cleanBudget(input);
    if (!budget) return { ok: false, error: "fin.invalid" };
    const ref = adminDb().collection("budgets").doc(budgetId);
    if (!(await ref.get()).exists) return { ok: false, error: "fin.invalid" };
    await ref.update({ ...budget, updatedAt: FieldValue.serverTimestamp() });
    await audit("budgets.update", who.uid, budgetId, budget.projectEn);
    return { ok: true, id: budgetId };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function createExpense(idToken: string, input: ExpenseInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const expense = cleanExpense(input);
    if (!expense) return { ok: false, error: "fin.invalid" };
    const id = await saveNew("expenses", who.uid, expense, expense.vendorEn);
    return { ok: true, id };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateExpense(idToken: string, expenseId: string, input: ExpenseInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const expense = cleanExpense(input);
    if (!expense) return { ok: false, error: "fin.invalid" };
    const ref = adminDb().collection("expenses").doc(expenseId);
    if (!(await ref.get()).exists) return { ok: false, error: "fin.invalid" };
    await ref.update({ ...expense, updatedAt: FieldValue.serverTimestamp() });
    await audit("expenses.update", who.uid, expenseId, expense.vendorEn);
    return { ok: true, id: expenseId };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

const books = ["invoices", "bills", "cheques", "budgets", "expenses"] as const;

export async function deleteAccountingRecord(idToken: string, collection: (typeof books)[number], id: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!books.includes(collection)) return { ok: false, error: "fin.invalid" };
    const ref = adminDb().collection(collection).doc(id);
    if (!(await ref.get()).exists) return { ok: false, error: "fin.invalid" };
    await ref.delete();
    await audit(`${collection}.delete`, who.uid, id, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}
