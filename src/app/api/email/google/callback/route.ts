import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { qatarToday } from "@/lib/hr";
import { saveConnection, takePending } from "@/server/gmail";
import { audit } from "@/server/session";

/*
 * Google sends the Super Admin back here after they allow read-only access to the company mailbox.
 * The one-time `state` (stored when they pressed Connect) proves the request started in Settings.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (result: string) => Response.redirect(new URL(`/en/settings?mailbox=${result}`, url.origin), 303);
  if (!isAdminConfigured()) return back("error");
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const pending = state ? await takePending(state) : null;
  if (!pending) return back("expired");
  if (url.searchParams.get("error") || !code) return back("cancelled");
  // The person must still be an active Super Admin
  const user = await adminDb().collection("users").doc(pending.uid).get();
  if (user.data()?.role !== "superAdmin" || user.data()?.status === "disabled") return back("forbidden");
  try {
    const problem = await saveConnection(code, pending.redirectUri, pending.uid, qatarToday());
    if (problem) return back(problem === "mail.scopeMissing" ? "scope" : "error");
    await audit("mail.connect", pending.uid, "gmail", "");
    return back("connected");
  } catch {
    return back("error");
  }
}
