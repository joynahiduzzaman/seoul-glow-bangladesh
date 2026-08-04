import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { bkashProvider } from "../bkash";
import { nagadProvider } from "../nagad";
import { sslcommerzProvider } from "../sslcommerz";
import { shurjopayProvider } from "../shurjopay";

const ENV_KEYS = [
  "BKASH_APP_KEY",
  "BKASH_APP_SECRET",
  "BKASH_USERNAME",
  "NAGAD_MERCHANT_ID",
  "NAGAD_MERCHANT_PRIVATE_KEY",
  "SSLCOMMERZ_STORE_ID",
  "SSLCOMMERZ_STORE_PASSWORD",
  "SHURJOPAY_USERNAME",
  "SHURJOPAY_PASSWORD",
];

const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe("payment provider isConfigured()", () => {
  it("bKash reports not configured when credentials are missing", () => {
    expect(bkashProvider.isConfigured()).toBe(false);
  });

  it("bKash reports configured once all required credentials are set", () => {
    process.env.BKASH_APP_KEY = "key";
    process.env.BKASH_APP_SECRET = "secret";
    process.env.BKASH_USERNAME = "user";
    expect(bkashProvider.isConfigured()).toBe(true);
  });

  it("Nagad requires both merchant ID and private key", () => {
    process.env.NAGAD_MERCHANT_ID = "123";
    expect(nagadProvider.isConfigured()).toBe(false);
    process.env.NAGAD_MERCHANT_PRIVATE_KEY = "key";
    expect(nagadProvider.isConfigured()).toBe(true);
  });

  it("SSLCommerz (also backs Rocket/Card) requires store ID and password", () => {
    expect(sslcommerzProvider.isConfigured()).toBe(false);
    process.env.SSLCOMMERZ_STORE_ID = "store";
    process.env.SSLCOMMERZ_STORE_PASSWORD = "pass";
    expect(sslcommerzProvider.isConfigured()).toBe(true);
  });

  it("ShurjoPay requires username and password", () => {
    expect(shurjopayProvider.isConfigured()).toBe(false);
    process.env.SHURJOPAY_USERNAME = "user";
    process.env.SHURJOPAY_PASSWORD = "pass";
    expect(shurjopayProvider.isConfigured()).toBe(true);
  });
});
