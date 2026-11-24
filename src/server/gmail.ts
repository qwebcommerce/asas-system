import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { hasSecretKey, open, seal } from "@/server/secret-box";

/*
 * The company mailbox (Google Workspace / Gmail), read-only.
 *
 * A Super Admin connects it once with Google sign-in (OAuth, scope gmail.readonly). The refresh
 * token is stored encrypted in Firestore (secrets/gmail, closed to every browser by the rules).
 * The AI assistant searches and reads messages through these functions; nothing here can send,
 * delete or change email.
 *
 * Needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and EMAIL_TOKEN_KEY on the server.
 * GOOGLE_API_BASE_URL is optional (defaults to Google's endpoints; used to point tests at a stand-in).
 */

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function base(defaultHost: string) {
  return process.env.GOOGLE_API_BASE_URL?.replace(/\/$/, "") || defaultHost;
}
const tokenUrl = () => `${base("https://oauth2.googleapis.com")}/token`;
const revokeUrl = () => `${base("https://oauth2.googleapis.com")}/revoke`;
const gmailUrl = (path: string) => `${base("https://gmail.googleapis.com")}/gmail/v1/users/me/${path}`;

const doc = () => adminDb().collection("secrets").doc("gmail");
const pendingDoc = () => adminDb().collection("secrets").doc("gmailConnect");

export function gmailConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && hasSecretKey());
}

export type MailboxStatus = { configured: boolean; connected: boolean; address: string; connectedAt: string };

export async function mailboxStatus(): Promise<MailboxStatus> {
  const snap = await doc().get();
  const data = snap.data();
  return {
    configured: gmailConfigured(),
    connected: Boolean(snap.exists && data?.token),
    address: typeof data?.address === "string" ? data.address : "",
    connectedAt: typeof data?.connectedOn === "string" ? data.connectedOn : "",
  };
}

/** Google's consent page for the company mailbox; `state` ties the answer to this request. */
export async function connectUrl(uid: string, redirectUri: string, state: string) {
  await pendingDoc().set({ state, uid, redirectUri, expiresAt: Date.now() + 10 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

/** Checks the state of a returning Google sign-in; returns who started it and the redirect address used. */
export async function takePending(state: string) {
  const snap = await pendingDoc().get();
  const data = snap.data();
  await pendingDoc().delete();
  if (!data || data.state !== state || typeof data.expiresAt !== "number" || data.expiresAt < Date.now()) return null;
  return { uid: String(data.uid), redirectUri: String(data.redirectUri) };
}

type TokenReply = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenReply> {
  const response = await fetch(tokenUrl(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", ...body }),
    cache: "no-store",
  });
  return (await response.json()) as TokenReply;
}

/** Finishes the Google sign-in: exchanges the code, checks read-only access was granted, stores the token encrypted. */
export async function saveConnection(code: string, redirectUri: string, uid: string, today: string) {
  const reply = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri });
  if (!reply.refresh_token || !reply.access_token) return "mail.connectFailed";
  if (!(reply.scope ?? "").split(" ").includes(GMAIL_SCOPE)) return "mail.scopeMissing";
  const profile = await fetch(gmailUrl("profile"), { headers: { authorization: `Bearer ${reply.access_token}` }, cache: "no-store" });
  const address = profile.ok ? String(((await profile.json()) as { emailAddress?: string }).emailAddress ?? "") : "";
  await doc().set({ token: seal(reply.refresh_token), address, connectedBy: uid, connectedOn: today, connectedAt: FieldValue.serverTimestamp() });
  cached = null;
  return null;
}

export async function disconnect() {
  const snap = await doc().get();
  const token = snap.data()?.token;
  if (token) {
    try {
      await fetch(revokeUrl(), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token: open(token) }) });
    } catch {
      // Revoking is best effort; the stored token is deleted either way
    }
  }
  await doc().delete();
  cached = null;
}

let cached: { token: string; until: number } | null = null;

async function accessToken() {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const snap = await doc().get();
  const box = snap.data()?.token;
  if (!box) throw new MailboxError("mail.notConnected");
  const reply = await tokenRequest({ refresh_token: open(box), grant_type: "refresh_token" });
  if (!reply.access_token) throw new MailboxError(reply.error === "invalid_grant" ? "mail.expired" : "mail.connectFailed");
  cached = { token: reply.access_token, until: Date.now() + (reply.expires_in ?? 3000) * 1000 };
  return cached.token;
}

export class MailboxError extends Error {}

async function gmail<T>(path: string): Promise<T> {
  const response = await fetch(gmailUrl(path), { headers: { authorization: `Bearer ${await accessToken()}` }, cache: "no-store" });
  if (response.status === 401) cached = null;
  if (!response.ok) throw new MailboxError(`Gmail ${response.status}`);
  return (await response.json()) as T;
}

type Header = { name: string; value: string };
type Part = { mimeType?: string; body?: { data?: string; size?: number }; parts?: Part[]; filename?: string; headers?: Header[] };
type GmailMessage = { id: string; threadId: string; labelIds?: string[]; snippet?: string; internalDate?: string; payload?: Part };

function header(message: GmailMessage, name: string) {
  return message.payload?.headers?.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function decode(data: string) {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

/** Plain text of a message: the text/plain part, or the HTML part with tags removed. */
function bodyText(part: Part | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) return decode(part.body.data);
  for (const child of part.parts ?? []) {
    const text = bodyText(child);
    if (text) return text;
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return decode(part.body.data).replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  }
  return "";
}

function attachments(part: Part | undefined): string[] {
  if (!part) return [];
  return [...(part.filename ? [part.filename] : []), ...(part.parts ?? []).flatMap(attachments)];
}

export type MailSummary = { id: string; thread_id: string; date: string; from: string; to: string; subject: string; snippet: string; unread: boolean; important: boolean };

/** Messages matching a Gmail search (e.g. "newer_than:7d", "is:unread", "from:client@x.com"), newest first. */
export async function searchMail(query: string, max: number): Promise<MailSummary[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(Math.min(Math.max(max, 1), 50)) });
  const list = await gmail<{ messages?: { id: string }[] }>(`messages?${params}`);
  const ids = (list.messages ?? []).map((item) => item.id);
  const messages = await Promise.all(
    ids.map((id) => gmail<GmailMessage>(`messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`)),
  );
  return messages.map((message) => ({
    id: message.id,
    thread_id: message.threadId,
    date: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : header(message, "Date"),
    from: header(message, "From"),
    to: header(message, "To"),
    subject: header(message, "Subject"),
    snippet: message.snippet ?? "",
    unread: (message.labelIds ?? []).includes("UNREAD"),
    important: (message.labelIds ?? []).includes("IMPORTANT"),
  }));
}

/** One message in full (text only, at most ~12,000 characters; attachments listed by name). */
export async function readMail(id: string) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new MailboxError("Bad message id");
  const message = await gmail<GmailMessage>(`messages/${id}?format=full`);
  const text = bodyText(message.payload);
  return {
    id: message.id,
    thread_id: message.threadId,
    date: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : header(message, "Date"),
    from: header(message, "From"),
    to: header(message, "To"),
    cc: header(message, "Cc"),
    subject: header(message, "Subject"),
    body: text.length > 12000 ? `${text.slice(0, 12000)}\n[… message shortened]` : text,
    attachments: attachments(message.payload),
  };
}
