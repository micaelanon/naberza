import { eventBus } from "@/lib/events";
import { auditService } from "@/lib/audit";

import type { BaseAdapter, ConnectionConfig, ConnectionType, HealthCheckResult } from "./adapter-types";
import { AdapterError } from "./adapter-types";

interface RegisteredAdapter {
  adapter: BaseAdapter;
  config: ConnectionConfig;
  lastHealth?: HealthCheckResult;
}

/**
 * Adapter Registry — manages lifecycle and access to all external service adapters.
 *
 * Responsibilities:
 * - Register and unregister adapters
 * - Provide adapters to modules by connection ID or type
 * - Run health checks and track connection status
 * - Emit integration events on status changes
 * - Audit all lifecycle operations
 */
class AdapterRegistry {
  private adapters = new Map<string, RegisteredAdapter>();

  /**
   * Register a new adapter with its configuration.
   */
  async register(adapter: BaseAdapter, config: ConnectionConfig): Promise<void> {
    if (this.adapters.has(config.id)) {
      throw new AdapterError("VALIDATION_ERROR", `Adapter with id "${config.id}" is already registered`);
    }

    this.adapters.set(config.id, { adapter, config });

    await auditService.log({
      module: "integrations",
      action: "adapter.registered",
      entityType: "SourceConnection",
      entityId: config.id,
      actor: "system",
      status: "success",
      output: { name: config.name, type: config.type },
    });

    await eventBus.emit("integration.connected", {
      timestamp: new Date(),
      actor: { type: "system" },
      connectionId: config.id,
      connectionName: config.name,
      connectionType: config.type,
    });
  }

  /**
   * Unregister an adapter and dispose of its resources.
   */
  async unregister(connectionId: string): Promise<void> {
    const registered = this.adapters.get(connectionId);
    if (!registered) return;

    if (registered.adapter.dispose) {
      await registered.adapter.dispose();
    }

    this.adapters.delete(connectionId);

    await auditService.log({
      module: "integrations",
      action: "adapter.unregistered",
      entityType: "SourceConnection",
      entityId: connectionId,
      actor: "system",
      status: "success",
    });

    await eventBus.emit("integration.disconnected", {
      timestamp: new Date(),
      actor: { type: "system" },
      connectionId,
      connectionName: registered.config.name,
      connectionType: registered.config.type,
    });
  }

  /**
   * Get an adapter by connection ID. Returns null if not found.
   */
  get<T extends BaseAdapter>(connectionId: string): T | null {
    const registered = this.adapters.get(connectionId);
    return registered ? (registered.adapter as T) : null;
  }

  /**
   * Find all adapters of a specific type.
   */
  getByType<T extends BaseAdapter>(type: ConnectionType): T[] {
    const matches: T[] = [];
    for (const registered of this.adapters.values()) {
      if (registered.config.type === type && registered.config.status === "active") {
        matches.push(registered.adapter as T);
      }
    }
    return matches;
  }

  /**
   * Get the first active adapter of a specific type. Convenience for single-adapter scenarios.
   */
  getFirst<T extends BaseAdapter>(type: ConnectionType): T | null {
    const adapters = this.getByType<T>(type);
    return adapters[0] ?? null;
  }

  /**
   * Get the configuration for a connection.
   */
  getConfig(connectionId: string): ConnectionConfig | null {
    return this.adapters.get(connectionId)?.config ?? null;
  }

  /**
   * List all registered connections with their status.
   */
  listConnections(): ConnectionConfig[] {
    return Array.from(this.adapters.values()).map((r) => ({
      ...r.config,
      lastHealthCheck: r.lastHealth?.checkedAt,
    }));
  }

  /**
   * Run a health check on a specific adapter.
   */
  async checkHealth(connectionId: string): Promise<HealthCheckResult> {
    const registered = this.adapters.get(connectionId);
    if (!registered) {
      return { healthy: false, latencyMs: 0, message: "Adapter not found", checkedAt: new Date() };
    }

    try {
      const result = await registered.adapter.testConnection();
      registered.lastHealth = result;
      registered.config.lastHealthCheck = result.checkedAt;

      if (!result.healthy && registered.config.status === "active") {
        registered.config.status = "error";
        registered.config.lastError = result.message;

        await eventBus.emit("integration.health.degraded", {
          timestamp: new Date(),
          actor: { type: "system" },
          connectionId,
          connectionName: registered.config.name,
          connectionType: registered.config.type,
          healthy: false,
          latencyMs: result.latencyMs,
          message: result.message,
        });
      } else if (result.healthy && registered.config.status === "error") {
        registered.config.status = "active";
        registered.config.lastError = undefined;
      }

      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        healthy: false,
        latencyMs: 0,
        message: error instanceof Error ? error.message : "Unknown error",
        checkedAt: new Date(),
      };

      registered.lastHealth = result;
      registered.config.status = "error";
      registered.config.lastError = result.message;

      return result;
    }
  }

  /**
   * Run health checks on all registered adapters.
   */
  async checkAllHealth(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();
    for (const [id] of this.adapters) {
      results.set(id, await this.checkHealth(id));
    }
    return results;
  }

  /**
   * Clear all adapters. For testing teardown.
   */
  async clear(): Promise<void> {
    for (const [id] of this.adapters) {
      await this.unregister(id);
    }
  }
}

// Singleton instance
export const adapterRegistry = new AdapterRegistry();

// Export class for testing
export { AdapterRegistry };
