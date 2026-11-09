"use server";

import { FieldValue } from "firebase-admin/firestore";
import type { ActionResult } from "@/lib/directory";
import { qatarToday } from "@/lib/hr";
import { measureQty, offerKinds, offerProblem, offerStatuses, offerUnits, priceById, type OfferInput, type OfferLine, type OfferPayment, type OfferStage } from "@/lib/offers";
import { adminDb } from "@/lib/firebase-admin";
import { canWriteModule, seesOwn } from "@/lib/access";
import { actor, audit, type Gate } from "@/server/session";

function dim(value: number | null) {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < 0 || value > 1000) return null;
  return Math.round(value * 100) / 100;
}

function clean(input: OfferInput): OfferInput | string {
  const clientEn = input.clientEn.trim();
  const clientAr = input.clientAr.trim();
  const projectEn = input.projectEn.trim();
  const projectAr = input.projectAr.trim();
  const validUntil = /^\d{4}-\d{2}-\d{2}$/.test(input.validUntil) ? input.validUntil : "";
  if (!clientEn || !clientAr || !projectEn || !projectAr || !validUntil || !offerStatuses.includes(input.status)) return "us.invalid";
  if (!offerKinds.includes(input.kind)) return "us.invalid";
  if (!Number.isInteger(input.discountPct) || input.discountPct < 0 || input.discountPct > 100) return "us.invalid";
  if (!Array.isArray(input.lines) || input.lines.length > 80) return "us.invalid";
  const lines: OfferLine[] = [];
  for (const line of input.lines) {
    const roomEn = line.roomEn.trim();
    const roomAr = line.roomAr.trim();
    const blank = !roomEn && !roomAr && line.l === null && line.w === null && line.h === null;
    if (blank) continue;
    const price = priceById(line.priceId);
    if (!price || !roomEn || !roomAr) return "us.invalid";
    if (!Number.isFinite(line.rate) || line.rate < 0 || line.rate > 1_000_000) return "us.invalid";
    const l = dim(line.l);
    const w = dim(line.w);
    const h = dim(line.h);
    if ((line.l !== null && l === null) || (line.w !== null && w === null) || (line.h !== null && h === null)) return "us.invalid";
    const unit = offerUnits.find((entry) => entry === line.unit) ?? price.unit;
    const qty = measureQty(unit, l, w, h, line.qty);
    if ((unit === "pcs" || unit === "set") && (!Number.isFinite(line.qty) || line.qty < 0 || line.qty > 100_000)) return "us.invalid";
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
  const stages: OfferStage[] = [];
  for (const stage of input.stages.slice(0, 8)) {
    const titleEn = stage.titleEn.trim();
    const titleAr = stage.titleAr.trim();
    if (!titleEn && !titleAr && !stage.detailEn.trim() && !stage.detailAr.trim()) continue;
    stages.push({ titleEn, titleAr, detailEn: stage.detailEn.trim().slice(0, 400), detailAr: stage.detailAr.trim().slice(0, 400) });
  }
  const payments: OfferPayment[] = input.payments.slice(0, 6).map((payment) => ({
    labelEn: payment.labelEn.trim().slice(0, 80),
    labelAr: payment.labelAr.trim().slice(0, 80),
    percent: payment.percent,
    whenEn: payment.whenEn.trim().slice(0, 160),
    whenAr: payment.whenAr.trim().slice(0, 160),
  }));
  const offer: OfferInput = {
    clientEn,
    clientAr,
    phone: input.phone.trim(),
    clientId: input.clientId.trim(),
    addressEn: input.addressEn.trim().slice(0, 160),
    addressAr: input.addressAr.trim().slice(0, 160),
    capacityEn: input.capacityEn.trim().slice(0, 160),
    capacityAr: input.capacityAr.trim().slice(0, 160),
    projectEn,
    projectAr,
    reference: input.reference.trim().slice(0, 40),
    kind: input.kind,
    issuedOn: input.issuedOn,
    areaFrom: input.areaFrom,
    areaTo: input.areaTo,
    packageAmount: input.packageAmount,
    scopeEn: input.scopeEn.trim().slice(0, 800),
    scopeAr: input.scopeAr.trim().slice(0, 800),
    stages,
    payments,
    status: input.status,
    discountPct: input.discountPct,
    validUntil,
    lines,
  };
  const problem = offerProblem(offer);
  return problem || offer;
}

async function manager(idToken: string, offerId?: string) {
  const who = await actor(idToken);
  if ("error" in who) return who;
  if (!canChangeOffer(who, offerId ? await ownerOf(offerId) : who.uid)) return { error: "off.forbidden" as const };
  return who;
}

function canChangeOffer(who: Gate, owner: string | null) {
  const level = who.level("offers");
  if (canWriteModule(level)) return true;
  return seesOwn(level) && owner === who.uid;
}

async function ownerOf(offerId: string) {
  const snap = await adminDb().collection("offers").doc(offerId).get();
  return typeof snap.data()?.createdBy === "string" ? snap.data()?.createdBy : "";
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
    if (typeof offer === "string") return { ok: false, error: offer };
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
    const who = await manager(idToken, offerId);
    if ("error" in who) return { ok: false, error: who.error };
    const offer = clean(input);
    if (typeof offer === "string") return { ok: false, error: offer };
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
    const who = await manager(idToken, offerId);
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
