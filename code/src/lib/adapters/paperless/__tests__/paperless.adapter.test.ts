import { describe, expect, it, vi } from "vitest";
import { PaperlessAdapter } from "../paperless.adapter";
import type { ConnectionConfig } from "../../adapter-types";
import { AdapterError } from "../../adapter-types";

const baseConnection: ConnectionConfig = {
  id: "conn-paperless-1",
  name: "Test Paperless",
  type: "paperless",
  status: "active",
  permissions: { read: true, write: false },
  // eslint-disable-next-line sonarjs/no-clear-text-protocols
  config: { baseUrl: "http://paperless.local", token: "test-token-123" },
};

describe("PaperlessAdapter", () => {
  it("constructs correctly from connection config", () => {
    const adapter = new PaperlessAdapter(baseConnection);
    expect(adapter.connectionId).toBe("conn-paperless-1");
    expect(adapter.type).toBe("paperless");
  });

  it("throws on missing baseUrl", () => {
    expect(
      () => new PaperlessAdapter({ ...baseConnection, config: { token: "x" } })
    ).toThrow(AdapterError);
  });

  it("throws on missing token", () => {
    expect(
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      () => new PaperlessAdapter({ ...baseConnection, config: { baseUrl: "http://test" } })
    ).toThrow(AdapterError);
  });

  it("strips trailing slash from baseUrl", () => {
    const adapter = new PaperlessAdapter({
      ...baseConnection,
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      config: { baseUrl: "http://paperless.local/", token: "tok" },
    });
    expect(adapter.getDownloadUrl({ id: 1 } as never)).toBe(
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      "http://paperless.local/api/documents/1/download/"
    );
  });

  it("returns unhealthy on connection failure", async () => {
    const adapter = new PaperlessAdapter(baseConnection);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const result = await adapter.testConnection();
    expect(result.healthy).toBe(false);
    expect(result.message).toContain("Cannot connect");
    vi.unstubAllGlobals();
  });

  it("returns healthy on successful connection", async () => {
    const adapter = new PaperlessAdapter(baseConnection);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ count: 0, results: [] }),
    }));
    const result = await adapter.testConnection();
    expect(result.healthy).toBe(true);
    vi.unstubAllGlobals();
  });

  it("throws AUTH_FAILED on 401", async () => {
    const adapter = new PaperlessAdapter(baseConnection);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(adapter.getDocuments()).rejects.toThrow("authentication failed");
    vi.unstubAllGlobals();
  });

  it("builds correct download and thumbnail URLs", () => {
    const adapter = new PaperlessAdapter(baseConnection);
    const doc = { id: 42 } as never;
    // eslint-disable-next-line sonarjs/no-clear-text-protocols
    expect(adapter.getDownloadUrl(doc)).toBe("http://paperless.local/api/documents/42/download/");
    // eslint-disable-next-line sonarjs/no-clear-text-protocols
    expect(adapter.getThumbnailUrl(doc)).toBe("http://paperless.local/api/documents/42/thumb/");
  });
});
