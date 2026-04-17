import { describe, expect, it, vi } from "vitest";
import { HomeAssistantAdapter } from "../home-assistant.adapter";
import type { ConnectionConfig } from "../../adapter-types";
import { AdapterError } from "../../adapter-types";

const baseConnection: ConnectionConfig = {
  id: "conn-ha-1",
  name: "Test Home Assistant",
  type: "home_assistant",
  status: "active",
  permissions: { read: true, write: true },
  // eslint-disable-next-line sonarjs/no-clear-text-protocols
  config: { baseUrl: "http://homeassistant.local:8123", token: "test-ha-token-123" },
};

describe("HomeAssistantAdapter", () => {
  it("constructs correctly from connection config", () => {
    const adapter = new HomeAssistantAdapter(baseConnection);
    expect(adapter.connectionId).toBe("conn-ha-1");
    expect(adapter.type).toBe("home_assistant");
  });

  it("throws on missing baseUrl", () => {
    expect(
      () => new HomeAssistantAdapter({ ...baseConnection, config: { token: "x" } })
    ).toThrow(AdapterError);
  });

  it("throws on missing token", () => {
    expect(
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      () => new HomeAssistantAdapter({ ...baseConnection, config: { baseUrl: "http://test" } })
    ).toThrow(AdapterError);
  });

  it("strips trailing slash from baseUrl", async () => {
    const adapter = new HomeAssistantAdapter({
      ...baseConnection,
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      config: { baseUrl: "http://homeassistant.local:8123/", token: "tok" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    }));
    const fetchMock = vi.mocked(fetch);
    await adapter.getStates().catch(() => undefined);
    expect(fetchMock).toHaveBeenCalledWith(
      // eslint-disable-next-line sonarjs/no-clear-text-protocols
      "http://homeassistant.local:8123/api/states",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer tok" }) })
    );
    vi.unstubAllGlobals();
  });

  it("returns unhealthy on connection failure", async () => {
    const adapter = new HomeAssistantAdapter(baseConnection);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const result = await adapter.testConnection();
    expect(result.healthy).toBe(false);
    expect(result.message).toContain("Cannot connect");
    vi.unstubAllGlobals();
  });

  it("returns healthy on successful connection", async () => {
    const adapter = new HomeAssistantAdapter(baseConnection);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: "API running." }),
    }));
    const result = await adapter.testConnection();
    expect(result.healthy).toBe(true);
    vi.unstubAllGlobals();
  });

  it("throws AUTH_FAILED on 401", async () => {
    const adapter = new HomeAssistantAdapter(baseConnection);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(adapter.getStates()).rejects.toThrow("authentication failed");
    vi.unstubAllGlobals();
  });

  it("throws NOT_FOUND on 404 for getState", async () => {
    const adapter = new HomeAssistantAdapter(baseConnection);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(adapter.getState("binary_sensor.unknown")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    vi.unstubAllGlobals();
  });

  it("identifies notable states correctly", () => {
    const adapter = new HomeAssistantAdapter(baseConnection);
    const makeState = (s: string) => ({
      entity_id: "binary_sensor.test",
      state: s,
      attributes: {},
      last_changed: "",
      last_updated: "",
      context: { id: "" },
    });
    expect(adapter.isNotableState(makeState("on"))).toBe(true);
    expect(adapter.isNotableState(makeState("triggered"))).toBe(true);
    expect(adapter.isNotableState(makeState("problem"))).toBe(true);
    expect(adapter.isNotableState(makeState("alarm"))).toBe(true);
    expect(adapter.isNotableState(makeState("off"))).toBe(false);
    expect(adapter.isNotableState(makeState("unavailable"))).toBe(false);
  });

  it("getDomain extracts domain correctly", () => {
    const adapter = new HomeAssistantAdapter(baseConnection);
    expect(adapter.getDomain("binary_sensor.front_door")).toBe("binary_sensor");
    expect(adapter.getDomain("alarm_control_panel.home")).toBe("alarm_control_panel");
    expect(adapter.getDomain("light.kitchen")).toBe("light");
  });
});
