"use server";

import { isDepartment, type ActionResult, type Department } from "@/lib/directory";
import { isLockedRole, isPermissionLevel, matrixModules, matrixRoles, type RoleMatrix } from "@/lib/access";
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

export async function saveRoleMatrix(idToken: string, matrix: RoleMatrix): Promise<ActionResult> {
  try {
    const who = await admin(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const next: Record<string, Record<string, string>> = {};
    for (const role of matrixRoles) {
      if (isLockedRole(role)) continue;
      const row: Record<string, string> = {};
      for (const module of matrixModules) {
        const level = matrix[role]?.[module];
        if (!isPermissionLevel(level)) return { ok: false, error: "us.invalid" };
        row[module] = level;
      }
      next[role] = row;
    }
    await adminDb().collection("settings").doc("roleMatrix").set(next, { merge: true });
    await audit("access.permission", who.uid, "roleMatrix", "saved");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}
