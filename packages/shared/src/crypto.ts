import { createHash, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const API_KEY_PREFIX = "hl_live_";

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

/** SHA-256 hex digest — store only this value in the database. */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}

export function isApiKeyFormat(value: string): boolean {
  return value.startsWith(API_KEY_PREFIX) && value.length > API_KEY_PREFIX.length + 8;
}

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function decodeEncryptionKey(keyHex: string): Buffer {
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("ENDPOINT_SECRET_ENCRYPTION_KEY must be 32 bytes (64 hex chars)");
  }
  return key;
}

/** AES-256-GCM authenticated encryption for endpoint signing secrets at rest. */
export function encryptSecret(plaintext: string, keyHex: string): string {
  const key = decodeEncryptionKey(keyHex);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(ciphertextB64: string, keyHex: string): string {
  const key = decodeEncryptionKey(keyHex);
  const data = Buffer.from(ciphertextB64, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}
