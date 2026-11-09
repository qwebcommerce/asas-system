import { FieldValue } from "firebase-admin/firestore";
import { mapMatrix, roleLevel, type MatrixModule, type PermissionLevel } from "@/lib/access";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase-admin";

export type Gate = {
  uid: string;
  role: string;
  level: (module: MatrixModule) => PermissionLevel;
};

export async function actor(idToken: string): Promise<Gate | { error: string }> {
  if (!isAdminConfigured()) return { error: "auth.notConfigured" };
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    const snap = await adminDb().collection("users").doc(decoded.uid).get();
    if (!snap.exists) return { error: "auth.notInDirectory" };
    const data = snap.data() ?? {};
    if (data.status === "disabled") return { error: "auth.disabled" };
    const role = typeof data.role === "string" ? data.role : "";
    const matrixSnap = await adminDb().collection("settings").doc("roleMatrix").get();
    const matrix = mapMatrix(matrixSnap.exists ? matrixSnap.data() : undefined);
    return { uid: decoded.uid, role, level: (module) => roleLevel(matrix, role, module) };
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

