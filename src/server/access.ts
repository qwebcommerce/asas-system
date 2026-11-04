"use server";

import { FieldValue } from "firebase-admin/firestore";
import { isDepartment, type ActionResult, type Department } from "@/lib/directory";
import { defaultMatrix, isMatrixModule, isMatrixRole, isPermissionLevel, type MatrixModule, type MatrixRole, type PermissionLevel } from "@/lib/access";
import { adminDb } from "@/lib/firebase-admin";
import { actor, audit } from "@/server/session";

async function admin(idToken: string) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  if (who.role !== "superAdmin") return { error: "us.forbidden" as const };
  return who;
}

export async function updateUserDepartment(idToken: string, userId: string, department: Department): Promise<ActionResult> {
  try {
    const who = await admin(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!isDepartment(department)) return { ok: false, error: "us.invalid" };
    await adminDb().collection("users").doc(userId).update({ department });
    await audit("user.department", who.uid, userId, department);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function saveBankAccount(
  idToken: string,
  input: { id?: string; name: string; bank: string; last4: string; balance: number },
): Promise<ActionResult> {
  try {
    const who = await admin(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const name = input.name.trim();
    const bank = input.bank.trim();
    const last4 = input.last4.trim();
    if (!name || !bank || !/^\d{4}$/.test(last4) || !Number.isFinite(input.balance)) return { ok: false, error: "us.invalid" };
    const payload = { name, bank, last4, balance: input.balance, updatedBy: who.uid, updatedAt: FieldValue.serverTimestamp() };
    if (input.id) {
      await adminDb().collection("bankAccounts").doc(input.id).update(payload);
      await audit("bank.update", who.uid, input.id, last4);
    } else {
      const ref = await adminDb().collection("bankAccounts").add({ ...payload, createdBy: who.uid, createdAt: FieldValue.serverTimestamp() });
      await audit("bank.create", who.uid, ref.id, last4);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteBankAccount(idToken: string, accountId: string): Promise<ActionResult> {
  try {
    const who = await admin(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    await adminDb().collection("bankAccounts").doc(accountId).delete();
    await audit("bank.delete", who.uid, accountId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updatePermission(idToken: string, role: MatrixRole, module: MatrixModule, level: PermissionLevel): Promise<ActionResult> {
  try {
    const who = await admin(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!isMatrixRole(role) || !isMatrixModule(module) || !isPermissionLevel(level)) return { ok: false, error: "us.invalid" };
    if (role === "superAdmin" && module === "users" && level !== "full") return { ok: false, error: "us.invalid" };
    const ref = adminDb().collection("settings").doc("roleMatrix");
    const snap = await ref.get();
    const current = snap.exists ? snap.data() ?? {} : structuredClone(defaultMatrix);
    const row = current[role] && typeof current[role] === "object" ? current[role] : {};
    await ref.set({ ...current, [role]: { ...row, [module]: level } }, { merge: true });
    await audit("access.permission", who.uid, role, `${module}:${level}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}
