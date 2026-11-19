import { FieldValue } from "firebase-admin/firestore";
import { DISCIPLINES } from "@/components/site/content";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";
import { isLocale } from "@/i18n/routing";

/*
 * Public endpoint behind the website's "Request a call" forms.
 * Stores each request in the `consultations` Firestore collection (server-side only;
 * clients cannot read or write that collection directly).
 */

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  // Spam trap: real visitors never see the "website" field
  if (text(body.website, 200)) return Response.json({ ok: true });

  const name = text(body.name, 120);
  const phone = text(body.phone, 30);
  const project = text(body.project, 2000);
  const services = Array.isArray(body.services)
    ? DISCIPLINES.filter((key) => (body.services as unknown[]).includes(key))
    : [];
  const locale = typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "en";
  const source = body.source === "hero" ? "hero" : "contact";

  if (name.length < 2 || !/^[+\d\s()-]{6,30}$/.test(phone) || phone.replace(/\D/g, "").length < 6) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  if (!isAdminConfigured()) {
    return Response.json({ ok: false, error: "not-configured" }, { status: 503 });
  }

  try {
    await adminDb().collection("consultations").add({
      name,
      phone,
      services,
      project,
      locale,
      source,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("consultation save failed", error);
    return Response.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
