export const payrollStatuses = ["draft", "approved", "paid"] as const;
export const payMethods = ["bank", "cash"] as const;

export type PayrollStatus = (typeof payrollStatuses)[number];
export type PayMethod = (typeof payMethods)[number];

export type PayrollLine = {
  employeeId: string;
  code: string;
  name: string;
  basic: number;
  allowance: number;
  deduction: number;
  method: PayMethod;
  absent: number;
  late: number;
};

export type PayrollRun = {
  id: string;
  month: string;
  status: PayrollStatus;
  lines: PayrollLine[];
  attendanceSent: boolean;
  createdBy: string;
  approvedBy: string;
  paidBy: string;
};

export function lineNet(line: Pick<PayrollLine, "basic" | "allowance" | "deduction">) {
  return line.basic + line.allowance - line.deduction;
}

export function runTotals(lines: PayrollLine[]) {
  return lines.reduce(
    (totals, line) => {
      const net = lineNet(line);
      totals.total += net;
      totals[line.method] += net;
      return totals;
    },
    { bank: 0, cash: 0, total: 0 },
  );
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function money(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1_000_000 ? value : null;
}

function count(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 31 ? value : 0;
}

export function mapPayrollRun(id: string, data: Record<string, unknown>): PayrollRun | null {
  const month = /^\d{4}-\d{2}$/.test(text(data.month)) ? text(data.month) : "";
  const status = payrollStatuses.find((item) => item === data.status);
  if (!month || month !== id || !status || !Array.isArray(data.lines)) return null;
  const lines: PayrollLine[] = [];
  for (const item of data.lines) {
    if (!item || typeof item !== "object") return null;
    const line = item as Record<string, unknown>;
    const basic = money(line.basic);
    const allowance = money(line.allowance);
    const deduction = money(line.deduction);
    const method = payMethods.find((entry) => entry === line.method);
    const employeeId = text(line.employeeId);
    if (basic === null || allowance === null || deduction === null || !method || !employeeId) return null;
    if (deduction > basic + allowance) return null;
    lines.push({
      employeeId,
      code: text(line.code),
      name: text(line.name),
      basic,
      allowance,
      deduction,
      method,
      absent: count(line.absent),
      late: count(line.late),
    });
  }
  return {
    id,
    month,
    status,
    lines,
    attendanceSent: data.attendanceSent === true,
    createdBy: text(data.createdBy),
    approvedBy: text(data.approvedBy),
    paidBy: text(data.paidBy),
  };
}
