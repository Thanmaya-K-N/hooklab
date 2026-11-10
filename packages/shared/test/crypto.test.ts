import { describe, it, expect } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  generateApiKey,
  hashApiKey,
  isApiKeyFormat,
} from "../src/crypto.js";

const TEST_KEY = "a".repeat(64);

describe("API keys", () => {
  it("generates hl_live_ prefixed keys", () => {
    const key = generateApiKey();
    expect(isApiKeyFormat(key)).toBe(true);
    expect(hashApiKey(key)).toHaveLength(64);
  });
});

describe("secret encryption", () => {
  it("round-trips endpoint secrets", () => {
    const secret = "endpoint_signing_secret_value";
    const ciphertext = encryptSecret(secret, TEST_KEY);
    expect(decryptSecret(ciphertext, TEST_KEY)).toBe(secret);
  });
});
