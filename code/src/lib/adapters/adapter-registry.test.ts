import { describe, it, expect, beforeEach, vi } from "vitest";

import { AdapterRegistry } from "./adapter-registry";
import type { BaseAdapter, ConnectionConfig, HealthCheckResult } from "./adapter-types";

// Mock the singleton dependencies
vi.mock("@/lib/events", () => ({
  eventBus: {
    emit: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    clear: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  auditService: {
    log: vi.fn().mockResolvedValue({ id: "audit-mock" }),
  },
}));

function createMockAdapter(
  overrides?: Partial<BaseAdapter> & { healthResult?: HealthCheckResult }
): BaseAdapter {
  const healthResult = overrides?.healthResult ?? {
    healthy: true,
    latencyMs: 50,
    checkedAt: new Date(),
  };

  return {
    type: overrides?.type ?? "paperless",
    connectionId: overrides?.connectionId ?? "conn-1",
    testConnection: vi.fn().mockResolvedValue(healthResult),
    dispose: vi.fn(),
    ...overrides,
  };
}

function createMockConfig(overrides?: Partial<ConnectionConfig>): ConnectionConfig {
  return {
    id: "conn-1",
    name: "Test Connection",
    type: "paperless",
    status: "active",
    permissions: { read: true, write: false },
    config: { url: "http://localhost:8000" },
    ...overrides,
  };
}

// eslint-disable-next-line max-lines-per-function -- test suite with multiple describe blocks
describe("AdapterRegistry", () => {
  let registry: AdapterRegistry;

  beforeEach(() => {
    registry = new AdapterRegistry();
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("registers an adapter successfully", async () => {
      const adapter = createMockAdapter();
      const config = createMockConfig();

      await registry.register(adapter, config);

      const result = registry.get("conn-1");
      expect(result).toBe(adapter);
    });

    it("throws if adapter id is already registered", async () => {
      const adapter = createMockAdapter();
      const config = createMockConfig();

      await registry.register(adapter, config);

      await expect(registry.register(adapter, config)).rejects.toThrow(
        'Adapter with id "conn-1" is already registered'
      );
    });
  });

  describe("unregister", () => {
    it("removes adapter and calls dispose", async () => {
      const adapter = createMockAdapter();
      const config = createMockConfig();

      await registry.register(adapter, config);
      await registry.unregister("conn-1");

      expect(registry.get("conn-1")).toBeNull();
      expect(adapter.dispose).toHaveBeenCalled();
    });

    it("does nothing if adapter not found", async () => {
      const connectionsBefore = registry.listConnections().length;
      await registry.unregister("nonexistent");
      expect(registry.listConnections()).toHaveLength(connectionsBefore);
    });
  });

  describe("get / getByType / getFirst", () => {
    it("returns null for unknown connection id", () => {
      expect(registry.get("nonexistent")).toBeNull();
    });

    it("finds adapters by type", async () => {
      await registry.register(
        createMockAdapter({ connectionId: "p1", type: "paperless" }),
        createMockConfig({ id: "p1", type: "paperless" })
      );
      await registry.register(
        createMockAdapter({ connectionId: "p2", type: "paperless" }),
        createMockConfig({ id: "p2", type: "paperless" })
      );
      await registry.register(
        createMockAdapter({ connectionId: "h1", type: "home_assistant" }),
        createMockConfig({ id: "h1", type: "home_assistant" })
      );

      const paperless = registry.getByType("paperless");
      expect(paperless).toHaveLength(2);

      const ha = registry.getByType("home_assistant");
      expect(ha).toHaveLength(1);

      const first = registry.getFirst("paperless");
      expect(first).toBeTruthy();

      const none = registry.getFirst("email_imap");
      expect(none).toBeNull();
    });

    it("only returns active adapters in getByType", async () => {
      await registry.register(
        createMockAdapter({ connectionId: "p1" }),
        createMockConfig({ id: "p1", status: "active" })
      );
      await registry.register(
        createMockAdapter({ connectionId: "p2" }),
        createMockConfig({ id: "p2", status: "inactive" })
      );

      const results = registry.getByType("paperless");
      expect(results).toHaveLength(1);
    });
  });

  describe("listConnections", () => {
    it("returns all registered connection configs", async () => {
      await registry.register(
        createMockAdapter({ connectionId: "p1" }),
        createMockConfig({ id: "p1", name: "Paperless 1" })
      );
      await registry.register(
        createMockAdapter({ connectionId: "h1", type: "home_assistant" }),
        createMockConfig({ id: "h1", name: "Home", type: "home_assistant" })
      );

      const connections = registry.listConnections();
      expect(connections).toHaveLength(2);
      expect(connections.map((c) => c.name)).toEqual(["Paperless 1", "Home"]);
    });
  });

  describe("checkHealth", () => {
    it("returns healthy result for working adapter", async () => {
      await registry.register(
        createMockAdapter({ connectionId: "p1" }),
        createMockConfig({ id: "p1" })
      );

      const result = await registry.checkHealth("p1");
      expect(result.healthy).toBe(true);
    });

    it("returns not found for unknown adapter", async () => {
      const result = await registry.checkHealth("nonexistent");
      expect(result.healthy).toBe(false);
      expect(result.message).toBe("Adapter not found");
    });

    it("marks adapter as error when health check fails", async () => {
      const unhealthyResult: HealthCheckResult = {
        healthy: false,
        latencyMs: 5000,
        message: "Connection timeout",
        checkedAt: new Date(),
      };

      await registry.register(
        createMockAdapter({ connectionId: "p1", healthResult: unhealthyResult }),
        createMockConfig({ id: "p1", status: "active" })
      );

      const result = await registry.checkHealth("p1");
      expect(result.healthy).toBe(false);

      const config = registry.getConfig("p1");
      expect(config?.status).toBe("error");
      expect(config?.lastError).toBe("Connection timeout");
    });

    it("recovers status when health check passes after error", async () => {
      const healthyResult: HealthCheckResult = {
        healthy: true,
        latencyMs: 50,
        checkedAt: new Date(),
      };

      await registry.register(
        createMockAdapter({ connectionId: "p1", healthResult: healthyResult }),
        createMockConfig({ id: "p1", status: "error" })
      );

      const result = await registry.checkHealth("p1");
      expect(result.healthy).toBe(true);

      const config = registry.getConfig("p1");
      expect(config?.status).toBe("active");
    });

    it("handles adapter testConnection throwing", async () => {
      const adapter = createMockAdapter({ connectionId: "p1" });
      (adapter.testConnection as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      await registry.register(adapter, createMockConfig({ id: "p1" }));

      const result = await registry.checkHealth("p1");
      expect(result.healthy).toBe(false);
      expect(result.message).toBe("Network error");
    });
  });

  describe("checkAllHealth", () => {
    it("checks all adapters", async () => {
      await registry.register(
        createMockAdapter({ connectionId: "p1" }),
        createMockConfig({ id: "p1" })
      );
      await registry.register(
        createMockAdapter({ connectionId: "h1", type: "home_assistant" }),
        createMockConfig({ id: "h1", type: "home_assistant" })
      );

      const results = await registry.checkAllHealth();
      expect(results.size).toBe(2);
      expect(results.get("p1")?.healthy).toBe(true);
      expect(results.get("h1")?.healthy).toBe(true);
    });
  });

  describe("clear", () => {
    it("removes all adapters", async () => {
      await registry.register(
        createMockAdapter({ connectionId: "p1" }),
        createMockConfig({ id: "p1" })
      );
      await registry.register(
        createMockAdapter({ connectionId: "h1", type: "home_assistant" }),
        createMockConfig({ id: "h1", type: "home_assistant" })
      );

      await registry.clear();

      expect(registry.listConnections()).toHaveLength(0);
    });
  });
});
