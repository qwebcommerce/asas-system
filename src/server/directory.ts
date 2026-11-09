"use server";

import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { isDepartment, isRequestedRole, isRole, type ActionResult, type Department, type ProfileSettings, type RequestedRole, type Role } from "@/lib/directory";
import { canWriteModule } from "@/lib/access";
import { actor, audit, type Gate } from "@/server/session";

function managesUsers(who: Gate) {
  return canWriteModule(who.level("users"));
}

export async function createDirectoryUser(
  idToken: string,
  input: { name: string; email: string; employeeId: string; mobile: string; password: string; role: Role; department: Department },
): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!managesUsers(who)) return { ok: false, error: "us.forbidden" };

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const employeeId = input.employeeId.trim();
    const mobile = input.mobile.trim();
    if (!name || !email.includes("@") || !employeeId || input.password.length < 8 || !isRole(input.role) || input.role === "superAdmin" || !isDepartment(input.department)) {
      return { ok: false, error: "us.invalid" };
    }

    const existingId = await adminDb().collection("users").where("employeeId", "==", employeeId).limit(1).get();
    if (!existingId.empty) return { ok: false, error: "us.exists" };

    const created = await adminAuth().createUser({
      email,
      password: input.password,
      displayName: name,
      disabled: false,
    });
    await adminAuth().setCustomUserClaims(created.uid, { role: input.role });
    await adminDb().collection("users").doc(created.uid).set({
      name,
      email,
      employeeId,
      mobile,
      role: input.role,
      department: input.department,
      status: "active",
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
      lastActiveAt: null,
    });
    await audit("user.create", who.uid, created.uid, `${employeeId} · ${input.role}`);
    return { ok: true };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "auth/email-already-exists") return { ok: false, error: "us.exists" };
    if (code === "auth/invalid-password" || code === "auth/weak-password") return { ok: false, error: "us.weakPassword" };
    if (!isAdminConfigured()) return { ok: false, error: "auth.notConfigured" };
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateUserRole(idToken: string, userId: string, role: Role): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!managesUsers(who)) return { ok: false, error: "us.forbidden" };
    if (!isRole(role) || userId === who.uid) return { ok: false, error: "us.invalid" };
    await adminDb().collection("users").doc(userId).update({ role });
    await adminAuth().setCustomUserClaims(userId, { role });
    await audit("user.role", who.uid, userId, role);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function setUsersDisabled(idToken: string, userIds: string[], disabled: boolean): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!managesUsers(who)) return { ok: false, error: "us.forbidden" };
    const ids = userIds.filter((id) => id !== who.uid);
    await Promise.all(
      ids.map(async (id) => {
        const snap = await adminDb().collection("users").doc(id).get();
        if (!snap.exists || snap.data()?.role === "superAdmin") return;
        await adminAuth().updateUser(id, { disabled });
        await snap.ref.update({ status: disabled ? "disabled" : "active" });
        await audit(disabled ? "user.disable" : "user.enable", who.uid, id, "");
      }),
    );
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateDirectoryUser(
  idToken: string,
  userId: string,
  input: { name: string; email: string; employeeId: string; mobile: string; password: string; role: Role; department: Department },
): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!managesUsers(who)) return { ok: false, error: "us.forbidden" };
    const snap = await adminDb().collection("users").doc(userId).get();
    if (!snap.exists || snap.data()?.role === "superAdmin" || userId === who.uid) return { ok: false, error: "us.forbidden" };

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const employeeId = input.employeeId.trim();
    const mobile = input.mobile.trim();
    const password = input.password.trim();
    if (!name || !email.includes("@") || !employeeId || !isRole(input.role) || input.role === "superAdmin" || !isDepartment(input.department)) {
      return { ok: false, error: "us.invalid" };
    }
    if (password && password.length < 8) return { ok: false, error: "us.weakPassword" };
    const existingId = await adminDb().collection("users").where("employeeId", "==", employeeId).get();
    if (existingId.docs.some((item) => item.id !== userId)) return { ok: false, error: "us.exists" };

    await adminAuth().updateUser(userId, {
      email,
      displayName: name,
      ...(password ? { password } : {}),
    });
    await adminAuth().setCustomUserClaims(userId, { role: input.role });
    await snap.ref.update({ name, email, employeeId, mobile, role: input.role, department: input.department });
    await audit("user.update", who.uid, userId, email);
    return { ok: true };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "auth/email-already-exists") return { ok: false, error: "us.exists" };
    if (code === "auth/invalid-password" || code === "auth/weak-password") return { ok: false, error: "us.weakPassword" };
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteDirectoryUser(idToken: string, userId: string): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!managesUsers(who) || userId === who.uid) return { ok: false, error: "us.forbidden" };
    const snap = await adminDb().collection("users").doc(userId).get();
    if (!snap.exists || snap.data()?.role === "superAdmin") return { ok: false, error: "us.forbidden" };
    try {
      await adminAuth().deleteUser(userId);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code !== "auth/user-not-found") throw error;
    }
    await snap.ref.delete();
    const requests = await adminDb().collection("accessRequests").where("userId", "==", userId).get();
    await Promise.all(requests.docs.map((item) => item.ref.delete()));
    await audit("user.delete", who.uid, userId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function submitAccessRequest(idToken: string, requestedRole: RequestedRole, message: string): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (who.role === "superAdmin") return { ok: false, error: "us.invalid" };
    if (!isRequestedRole(requestedRole)) return { ok: false, error: "us.invalid" };
    const userSnap = await adminDb().collection("users").doc(who.uid).get();
    const user = userSnap.data() ?? {};
    const open = await adminDb().collection("accessRequests").where("userId", "==", who.uid).get();
    if (open.docs.some((item) => item.data().status === "pending")) return { ok: false, error: "req.sentExists" };
    const ref = await adminDb().collection("accessRequests").add({
      userId: who.uid,
      name: typeof user.name === "string" ? user.name : "",
      employeeId: typeof user.employeeId === "string" ? user.employeeId : "",
      requestedRole,
      message: message.trim(),
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("access.request", who.uid, ref.id, requestedRole);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function reviewAccessRequest(
  idToken: string,
  requestId: string,
  decision: "approved" | "declined",
  role: Role,
): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    if (!managesUsers(who)) return { ok: false, error: "us.forbidden" };
    const ref = adminDb().collection("accessRequests").doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    const data = snap.data() ?? {};
    const userId = typeof data.userId === "string" ? data.userId : "";
    if (decision === "approved") {
      if (!isRole(role) || role === "superAdmin") return { ok: false, error: "us.invalid" };
      await adminDb().collection("users").doc(userId).update({ role });
      await adminAuth().setCustomUserClaims(userId, { role });
    }
    await ref.update({
      status: decision,
      reviewedBy: who.uid,
      reviewedAt: FieldValue.serverTimestamp(),
    });
    await audit(`access.${decision}`, who.uid, requestId, userId);
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateOwnProfile(idToken: string, input: ProfileSettings): Promise<ActionResult> {
  try {
    const who = await actor(idToken);
    if ("error" in who) return { ok: false, error: who.error };

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const employeeId = input.employeeId.trim();
    const mobile = input.mobile.trim();
    const locale = input.locale === "ar" ? "ar" : "en";
    const theme = input.theme === "dark" ? "dark" : "light";
    if (!name || !email.includes("@") || !employeeId) return { ok: false, error: "us.invalid" };

    const existingId = await adminDb().collection("users").where("employeeId", "==", employeeId).get();
    if (existingId.docs.some((item) => item.id !== who.uid)) return { ok: false, error: "us.exists" };

    const current = await adminAuth().getUser(who.uid);
    if (current.email?.toLowerCase() !== email) {
      await adminAuth().updateUser(who.uid, { email, displayName: name });
    } else if (current.displayName !== name) {
      await adminAuth().updateUser(who.uid, { displayName: name });
    }

    await adminDb().collection("users").doc(who.uid).update({
      name,
      email,
      employeeId,
      mobile,
      twoFactor: input.twoFactor,
      signInAlerts: input.signInAlerts,
      locale,
      theme,
    });
    await audit("user.profile", who.uid, who.uid, email);
    return { ok: true };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "auth/email-already-exists") return { ok: false, error: "us.exists" };
    if (code === "auth/invalid-email") return { ok: false, error: "us.invalid" };
    return { ok: false, error: "auth.failed" };
  }
}
