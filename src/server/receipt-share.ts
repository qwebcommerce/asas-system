import { mapReceipt, type Receipt } from "@/lib/accounting";
import { adminDb, isAdminConfigured } from "@/lib/firebase-admin";

/**
 * The receipt a client's link points to, read with the Admin SDK (clients have no account).
 * Tokens are 32 url-safe characters; anything else is rejected before touching Firestore.
 */
export async function receiptByShareToken(token: string): Promise<{ receipt: Receipt; invoiceNumber: string } | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token) || !isAdminConfigured()) return null;
  try {
    const snap = await adminDb().collection("receipts").where("shareToken", "==", token).limit(1).get();
    const doc = snap.docs[0];
    const receipt = doc ? mapReceipt(doc.id, doc.data()) : null;
    if (!receipt) return null;
    let invoiceNumber = "";
    if (receipt.invoiceId) {
      const invoice = await adminDb().collection("invoices").doc(receipt.invoiceId).get();
      invoiceNumber = typeof invoice.data()?.number === "string" ? (invoice.data()?.number as string) : "";
    }
    return { receipt, invoiceNumber };
  } catch (error) {
    console.error("shared receipt unavailable", error);
    return null;
  }
}
