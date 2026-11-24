"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { actor, audit } from "@/server/session";
import { connectUrl, disconnect, gmailConfigured, mailboxStatus, type MailboxStatus } from "@/server/gmail";

/** The company mailbox is managed and read by Super Admins only. */
async function superAdmin(idToken: string) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  if (who.role !== "superAdmin") return { error: "mail.forbidden" as const };
  return who;
}

/** Address Google sends the admin back to; it must be listed in the Google Cloud OAuth client. */
async function redirectUri() {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}/api/email/google/callback`;
}

export async function companyMailbox(idToken: string): Promise<({ ok: true; redirectUri: string } & MailboxStatus) | { ok: false; error: string }> {
  const who = await superAdmin(idToken);
  if ("error" in who) return { ok: false, error: who.error };
  return { ok: true, redirectUri: await redirectUri(), ...(await mailboxStatus()) };
}

export async function startGmailConnect(idToken: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const who = await superAdmin(idToken);
  if ("error" in who) return { ok: false, error: who.error };
  if (!gmailConfigured()) return { ok: false, error: "mail.notConfigured" };
  const state = randomBytes(24).toString("base64url");
  return { ok: true, url: await connectUrl(who.uid, await redirectUri(), state) };
}

export async function disconnectGmail(idToken: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const who = await superAdmin(idToken);
  if ("error" in who) return { ok: false, error: who.error };
  await disconnect();
  await audit("mail.disconnect", who.uid, "gmail", "");
  return { ok: true };
}
