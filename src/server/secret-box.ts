import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/*
 * Encrypts small secrets (the Gmail refresh token) before they are stored in Firestore.
 * Key: EMAIL_TOKEN_KEY (any long random string; hashed to 32 bytes). AES-256-GCM.
 */

function key() {
  const raw = process.env.EMAIL_TOKEN_KEY;
  if (!raw || raw.length < 16) throw new Error("EMAIL_TOKEN_KEY is missing or too short");
  return createHash("sha256").update(raw).digest();
}

export function hasSecretKey() {
  return Boolean(process.env.EMAIL_TOKEN_KEY && process.env.EMAIL_TOKEN_KEY.length >= 16);
}

export function seal(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

export function open(box: { iv: string; tag: string; data: string }) {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(box.iv, "base64"));
  decipher.setAuthTag(Buffer.from(box.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(box.data, "base64")), decipher.final()]).toString("utf8");
}
