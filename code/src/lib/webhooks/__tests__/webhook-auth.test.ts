import { describe, expect, it, afterEach, vi } from "vitest";
import { isValidWebhookToken, getValidTokens } from "../webhook-auth";

describe("webhook-auth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when no tokens are configured", () => {
    vi.stubEnv("WEBHOOK_TOKENS", "");
    expect(isValidWebhookToken("any-token")).toBe(false);
  });

  it("returns false for empty token string", () => {
    vi.stubEnv("WEBHOOK_TOKENS", "valid-token");
    expect(isValidWebhookToken("")).toBe(false);
  });

  it("returns true for a valid token", () => {
    vi.stubEnv("WEBHOOK_TOKENS", "secret-token-abc");
    expect(isValidWebhookToken("secret-token-abc")).toBe(true);
  });

  it("returns false for unknown token", () => {
    vi.stubEnv("WEBHOOK_TOKENS", "secret-token-abc");
    expect(isValidWebhookToken("wrong-token")).toBe(false);
  });

  it("supports multiple comma-separated tokens", () => {
    vi.stubEnv("WEBHOOK_TOKENS", "token-a, token-b, token-c");
    expect(isValidWebhookToken("token-a")).toBe(true);
    expect(isValidWebhookToken("token-b")).toBe(true);
    expect(isValidWebhookToken("token-c")).toBe(true);
    expect(isValidWebhookToken("token-d")).toBe(false);
  });

  it("trims whitespace from tokens", () => {
    vi.stubEnv("WEBHOOK_TOKENS", "  spaced-token  ");
    expect(isValidWebhookToken("spaced-token")).toBe(true);
  });

  it("getValidTokens returns empty set when env is not set", () => {
    vi.stubEnv("WEBHOOK_TOKENS", "");
    expect(getValidTokens().size).toBe(0);
  });

  it("getValidTokens returns all configured tokens", () => {
    vi.stubEnv("WEBHOOK_TOKENS", "t1,t2,t3");
    const tokens = getValidTokens();
    expect(tokens.size).toBe(3);
    expect(tokens.has("t1")).toBe(true);
    expect(tokens.has("t2")).toBe(true);
    expect(tokens.has("t3")).toBe(true);
  });
});
