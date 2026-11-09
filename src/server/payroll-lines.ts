import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { mapPayrollRun, type PayMethod, type PayrollLine } from "@/lib/payroll";

function basicOf(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  return rounded >= 0 && rounded <= 1_000_000 ? rounded : null;
}

export async function payrollLines(month: string, previous: PayrollLine[] = []) {
  const employees = await adminDb().collection("employees").get();
  const marks = await adminDb().collection("attendanceMarks").where("date", ">=", `${month}-01`).where("date", "<=", `${month}-31`).get();
  const absent = new Map<string, number>();
  const late = new Map<string, number>();
  marks.docs.forEach((item) => {
    const data = item.data();
    const employeeId = typeof data.employeeId === "string" ? data.employeeId : "";
    if (!employeeId) return;
    if (data.status === "absent") absent.set(employeeId, (absent.get(employeeId) ?? 0) + 1);
    if (data.status === "late") late.set(employeeId, (late.get(employeeId) ?? 0) + 1);
  });
  const kept = new Map(previous.map((line) => [line.employeeId, line]));
  const lines: PayrollLine[] = employees.docs.flatMap((item) => {
    const data = item.data();
    if (data.employment === "inactive") return [];
    const basic = basicOf(data.basic);
    if (basic === null) return [];
    const prior = kept.get(item.id);
    const allowance = prior?.allowance ?? 0;
    const deduction = Math.min(prior?.deduction ?? 0, basic + allowance);
    return [{
      employeeId: item.id,
      code: typeof data.employeeId === "string" ? data.employeeId : "",
      name: typeof data.name === "string" ? data.name : "",
      basic,
      allowance,
      deduction,
      method: (prior?.method ?? "cash") as PayMethod,
      absent: absent.get(item.id) ?? 0,
      late: late.get(item.id) ?? 0,
    }];
  }).sort((a, b) => a.name.localeCompare(b.name));
  return lines;
}

function sameLines(left: PayrollLine[], right: PayrollLine[]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function syncDraftPayrollRuns() {
  const drafts = await adminDb().collection("payrollRuns").where("status", "==", "draft").get();
  await Promise.all(drafts.docs.map(async (item) => {
    const stored = mapPayrollRun(item.id, item.data());
    if (!stored) return;
    const lines = await payrollLines(stored.month, stored.lines);
    if (lines.length === 0 || sameLines(stored.lines, lines)) return;
    await item.ref.update({ lines, updatedAt: FieldValue.serverTimestamp() });
  }));
}
