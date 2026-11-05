"use server";

import { FieldValue } from "firebase-admin/firestore";
import type { ActionResult } from "@/lib/directory";
import { qatarToday } from "@/lib/hr";
import { measureQty, offerStatuses, offerUnits, priceById, type OfferInput, type OfferLine } from "@/lib/offers";
import { adminDb } from "@/lib/firebase-admin";
import { actor, audit, canManageOffers } from "@/server/session";

function dim(value: number | null) {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0 || value > 1000) return null;
  return Math.round(value * 100) / 100;
}

function clean(input: OfferInput): OfferInput | null {
  const clientEn = input.clientEn.trim();
  const clientAr = input.clientAr.trim();
  const projectEn = input.projectEn.trim();
  const projectAr = input.projectAr.trim();
  const validUntil = /^\d{4}-\d{2}-\d{2}$/.test(input.validUntil) ? input.validUntil : "";
  if (!clientEn || !clientAr || !projectEn || !projectAr || !validUntil || !offerStatuses.includes(input.status)) return null;
  if (!Number.isInteger(input.discountPct) || input.discountPct < 0 || input.discountPct > 100) return null;
  if (!Array.isArray(input.lines) || input.lines.length > 80) return null;
  const lines: OfferLine[] = [];
  for (const line of input.lines) {
    const roomEn = line.roomEn.trim();
    const roomAr = line.roomAr.trim();
    const blank = !roomEn && !roomAr && line.l === null && line.w === null && line.h === null;
    if (blank) continue;
    const price = priceById(line.priceId);
    if (!price || !roomEn || !roomAr) return null;
    if (!Number.isFinite(line.rate) || line.rate < 0 || line.rate > 1_000_000) return null;
    const l = dim(line.l);
    const w = dim(line.w);
    const h = dim(line.h);
    if ((line.l !== null && l === null) || (line.w !== null && w === null) || (line.h !== null && h === null)) return null;
    const unit = offerUnits.find((entry) => entry === line.unit) ?? price.unit;
    const qty = measureQty(unit, l, w, h, line.qty);
    if ((unit === "pcs" || unit === "set") && (!Number.isFinite(line.qty) || line.qty < 0 || line.qty > 100_000)) return null;
    lines.push({
      roomEn,
      roomAr,
      priceId: price.id,
      workEn: price.nameEn,
      workAr: price.nameAr,
      trade: price.trade,
      l,
      w,
      h,
      qty,
      unit,
      rate: Math.round(line.rate * 100) / 100,
    });
  }
  return { clientEn, clientAr, projectEn, projectAr, status: input.status, discountPct: input.discountPct, validUntil, lines };
}

async function manager(idToken: string) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  if (!canManageOffers(who.role)) return { error: "off.forbidden" as const };
  return who;
}

function nextNumber(numbers: string[]) {
  const year = qatarToday().slice(0, 4);
  const prefix = `OF-${year}-`;
  const max = numbers.reduce((highest, value) => {
    if (!value.startsWith(prefix)) return highest;
    const sequence = Number(value.slice(prefix.length));
    return Number.isInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export async function createOffer(idToken: string, input: OfferInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const offer = clean(input);
    if (!offer) return { ok: false, error: "us.invalid" };
    const existing = await adminDb().collection("offers").get();
    const number = nextNumber(existing.docs.map((item) => (typeof item.data().number === "string" ? item.data().number : "")));
    const ref = await adminDb().collection("offers").add({
      ...offer,
      number,
      createdBy: who.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    await audit("offers.create", who.uid, ref.id, number);
    return { ok: true, id: ref.id };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function updateOffer(idToken: string, offerId: string, input: OfferInput): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const offer = clean(input);
    if (!offer) return { ok: false, error: "us.invalid" };
    const ref = adminDb().collection("offers").doc(offerId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    await ref.update({ ...offer, updatedAt: FieldValue.serverTimestamp() });
    await audit("offers.update", who.uid, offerId, typeof snap.data()?.number === "string" ? snap.data()?.number : "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}

export async function deleteOffer(idToken: string, offerId: string): Promise<ActionResult> {
  try {
    const who = await manager(idToken);
    if ("error" in who) return { ok: false, error: who.error };
    const ref = adminDb().collection("offers").doc(offerId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "us.invalid" };
    await ref.delete();
    await audit("offers.delete", who.uid, offerId, "");
    return { ok: true };
  } catch {
    return { ok: false, error: "auth.failed" };
  }
}
