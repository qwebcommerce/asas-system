import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase-admin";

export async function actor(idToken: string): Promise<{ uid: string; role: string } | { error: string }> {
  if (!isAdminConfigured()) return { error: "auth.notConfigured" };
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    const snap = await adminDb().collection("users").doc(decoded.uid).get();
    if (!snap.exists) return { error: "auth.notInDirectory" };
    const data = snap.data() ?? {};
    if (data.status === "disabled") return { error: "auth.disabled" };
    return { uid: decoded.uid, role: typeof data.role === "string" ? data.role : "" };
  } catch {
    return { error: "auth.failed" };
  }
}

export async function audit(action: string, actorId: string, targetId: string, detail: string) {
  await adminDb().collection("audit").add({
    action,
    actorId,
    targetId,
    detail,
    at: FieldValue.serverTimestamp(),
  });
}

export function canManageHr(role: string) {
  return role === "superAdmin" || role === "hr";
}
