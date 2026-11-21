"use server";

import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { billProblem, chequeDirections, chequeStatuses, expenseProblem, invoiceMath, invoiceProblem, receiptProblem, type BillInput, type BudgetInput, type ChequeInput, type ExpenseInput, type InvoiceInput, type ReceiptInput } from "@/lib/accounting";
import type { ActionResult } from "@/lib/directory";
import { qatarToday } from "@/lib/hr";
import { adminDb } from "@/lib/firebase-admin";
import { canWriteModule } from "@/lib/access";
import { projectLink } from "@/server/project-link";
import { actor, audit } from "@/server/session";

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}

function day(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function qar(value: number, minimum = 0) {
  return Number.isInteger(value) && value >= minimum && value <= 100_000_000 ? value : null;
}

async function manager(idToken: string) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  if (!canWriteModule(who.level("accounting"))) return { error: "fin.forbidden" as const };
  return who;
}

function cleanInvoice(input: InvoiceInput): InvoiceInput | string {
  const problem = invoiceProblem(input);
  if (problem) return problem;
  return {
    clientEn: clip(input.clientEn, 160),
    clientAr: clip(input.clientAr, 160),
    projectId: clip(input.projectId ?? "", 64),
    projectEn: clip(input.projectEn, 160),
    projectAr: clip(input.projectAr, 160),
    contract: input.contract,
    progressPct: input.progressPct,
    retentionPct: input.retentionPct,
    received: input.received,
    issuedOn: input.issuedOn,
    dueOn: input.dueOn,
    issued: input.issued === true,
  };
}

function cleanBill(input: BillInput): BillInput | string {
  const problem = billProblem(input);
  if (problem) return problem;
  return {
    supplierEn: clip(input.supplierEn, 160),
    supplierAr: clip(input.supplierAr, 160),
    category: input.category,
    projectId: clip(input.projectId ?? "", 64),
    projectEn: clip(input.projectEn, 160),
    projectAr: clip(input.projectAr, 160),
    reference: clip(input.reference, 80),
    note: clip(input.note, 400),
    issuedOn: input.issuedOn,
    dueOn: input.dueOn,
    amount: input.amount,
    paid: input.paid,
  };
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

function cleanExpense(input: ExpenseInput): ExpenseInput | string {
  const problem = expenseProblem(input);
  if (problem) return problem;
  return {
    vendorEn: clip(input.vendorEn, 160),
    vendorAr: clip(input.vendorAr, 160),
    category: input.category,
    projectId: clip(input.projectId ?? "", 64),
    projectEn: clip(input.projectEn, 160),
    projectAr: clip(input.projectAr, 160),
    reference: clip(input.reference, 80),
    note: clip(input.note, 400),
    spentOn: input.spentOn,
    dueOn: input.dueOn,
    amount: input.amount,
    paid: input.paid,
  };
}

/** Copies the linked project's names onto the record; rejects links to missing projects. */
async function linkProject<T extends { projectId: string; projectEn: string; projectAr: string }>(record: T | string): Promise<T | string> {
  if (typeof record === "string") return record;
  const link = await projectLink(record.projectId, record);
  return link ? { ...record, ...link } : "prj.missingProject";
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
    const invoice = await linkProject(cleanInvoice(input));
    if (typeof invoice === "string") return { ok: false, error: invoice };
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
    const invoice = await linkProject(cleanInvoice(input));
    if (typeof invoice === "string") return { ok: false, error: invoice };
    const ref = adminDb().collection("invoices").doc(invoiceId);
    if (!(await ref.get()).exists) return { ok: false, error: "fin.invalid" };
    // When receipts are recorded against this invoice, they decide the amount received
    const receipts = await adminDb().collection("receipts").where("invoiceId", "==", invoiceId).get();
    if (!receipts.empty) {
      invoice.received = receipts.docs.reduce((sum, doc) => sum + (Number(doc.data().amount) || 0), 0);
      if (invoice.received > invoiceMath(invoice.contract, invoice.progressPct, invoice.retentionPct).net) return { ok: false, error: "fin.receivedHigh" };
    }
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
    const bill = await linkProject(cleanBill(input));
    if (typeof bill === "string") return { ok: false, error: bill };
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
    const bill = await linkProject(cleanBill(input));
    if (typeof bill === "string") return { ok: false, error: bill };
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
    const expense = await linkProject(cleanExpense(input));
    if (typeof expense === "string") return { ok: false, error: expense };
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
    const expense = await linkProject(cleanExpense(input));
    if (typeof expense === "string") return { ok: false, error: expense };
    const ref = adminDb().collection("expenses").doc(expenseId);
    if (!(await ref.get()).exists) return { ok: false, error: "fin.invalid" };
    await ref.update({ ...expense, updatedAt: FieldValue.serverTimestamp() });
    await audit("expenses.update", who.uid, expenseId, expense.vendorEn);
    return { ok: true, id: expenseId };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

// ---------- Receipts (money received) ----------

/**
 * Returns the token of a receipt's client link, creating one when the receipt has none.
 * With `renew`, issues a new token so links shared earlier stop working.
 */
export async function receiptShareToken(idToken: string, receiptId: string, renew = false): Promise<ActionResult & { token?: string }> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const ref = adminDb().collection("receipts").doc(receiptId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "fin.invalid" };
    const current = snap.data()?.shareToken;
    if (!renew && typeof current === "string" && current) return { ok: true, id: receiptId, token: current };
    const token = newShareToken();
    await ref.update({ shareToken: token });
    if (renew) await audit("receipts.relink", who.uid, receiptId, String(snap.data()?.number ?? ""));
    return { ok: true, id: receiptId, token };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

function cleanReceipt(input: ReceiptInput): ReceiptInput | string {
  const problem = receiptProblem(input);
  if (problem) return problem;
  return {
    projectId: clip(input.projectId ?? "", 64),
    projectEn: clip(input.projectEn ?? "", 160),
    projectAr: clip(input.projectAr ?? "", 160),
    payerEn: clip(input.payerEn, 160),
    payerAr: clip(input.payerAr, 160),
    amount: input.amount,
    receivedOn: input.receivedOn,
    method: input.method,
    reference: input.method === "cash" ? "" : clip(input.reference, 80),
    bank: input.method === "cash" ? "" : clip(input.bank ?? "", 120),
    purposeEn: clip(input.purposeEn, 240),
    purposeAr: clip(input.purposeAr, 240),
    invoiceId: clip(input.invoiceId ?? "", 64),
    note: clip(input.note, 400),
  };
}

/** Unguessable token for the client's link to a receipt voucher. */
function newShareToken() {
  return randomBytes(24).toString("base64url");
}

async function nextReceiptNumber() {
  const prefix = `RCT-${qatarToday().slice(0, 4)}-`;
  const existing = await adminDb().collection("receipts").get();
  const max = existing.docs.reduce((highest, item) => {
    const number = typeof item.data().number === "string" ? (item.data().number as string) : "";
    const n = number.startsWith(prefix) ? Number(number.slice(prefix.length)) : 0;
    return Number.isInteger(n) ? Math.max(highest, n) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/**
 * Sets an invoice's "received" to the total of the receipts recorded against it.
 * Returns an error key if that total would exceed what the invoice asks for.
 */
async function syncInvoiceReceived(invoiceId: string, change: { id: string; amount: number } | null) {
  if (!invoiceId) return null;
  const ref = adminDb().collection("invoices").doc(invoiceId);
  const snap = await ref.get();
  if (!snap.exists) return "fin.invalid";
  const data = snap.data() ?? {};
  const receipts = await adminDb().collection("receipts").where("invoiceId", "==", invoiceId).get();
  let total = receipts.docs.reduce((sum, doc) => sum + (change && doc.id === change.id ? 0 : Number(doc.data().amount) || 0), 0);
  if (change) total += change.amount;
  const net = invoiceMath(Number(data.contract) || 0, Number(data.progressPct) || 0, Number(data.retentionPct) || 0).net;
  if (total > net) return "fin.receivedHigh";
  if (data.issued !== true && total > 0) return "fin.receivedDraft";
  await ref.update({ received: total });
  return null;
}

export async function createReceipt(idToken: string, input: ReceiptInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const receipt = await linkProject(cleanReceipt(input));
    if (typeof receipt === "string") return { ok: false, error: receipt };
    const ref = adminDb().collection("receipts").doc();
    const problem = await syncInvoiceReceived(receipt.invoiceId, { id: ref.id, amount: receipt.amount });
    if (problem) return { ok: false, error: problem };
    const number = await nextReceiptNumber();
    await ref.set({ ...receipt, number, shareToken: newShareToken(), createdBy: who.uid, createdAt: FieldValue.serverTimestamp() });
    await audit("receipts.create", who.uid, ref.id, number);
    return { ok: true, id: ref.id };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateReceipt(idToken: string, receiptId: string, input: ReceiptInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const receipt = await linkProject(cleanReceipt(input));
    if (typeof receipt === "string") return { ok: false, error: receipt };
    const ref = adminDb().collection("receipts").doc(receiptId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "fin.invalid" };
    const previousInvoice = typeof snap.data()?.invoiceId === "string" ? (snap.data()?.invoiceId as string) : "";
    const problem = await syncInvoiceReceived(receipt.invoiceId, { id: receiptId, amount: receipt.amount });
    if (problem) return { ok: false, error: problem };
    await ref.update({ ...receipt, updatedAt: FieldValue.serverTimestamp() });
    if (previousInvoice && previousInvoice !== receipt.invoiceId) await syncInvoiceReceived(previousInvoice, null);
    await audit("receipts.update", who.uid, receiptId, String(snap.data()?.number ?? ""));
    return { ok: true, id: receiptId };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

const books = ["invoices", "bills", "cheques", "budgets", "expenses", "receipts"] as const;

export async function deleteAccountingRecord(idToken: string, collection: (typeof books)[number], id: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!books.includes(collection)) return { ok: false, error: "fin.invalid" };
    const ref = adminDb().collection(collection).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "fin.invalid" };
    if (collection === "invoices" && !(await adminDb().collection("receipts").where("invoiceId", "==", id).limit(1).get()).empty) {
      return { ok: false, error: "fin.invoiceHasReceipts" };
    }
    await ref.delete();
    if (collection === "receipts") await syncInvoiceReceived(String(snap.data()?.invoiceId ?? ""), null);
    await audit(`${collection}.delete`, who.uid, id, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}
