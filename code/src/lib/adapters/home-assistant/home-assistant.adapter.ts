import type { BaseAdapter, ConnectionConfig, HealthCheckResult } from "@/lib/adapters/adapter-types";
import { AdapterError } from "@/lib/adapters/adapter-types";

export interface HomeAssistantConfig {
  baseUrl: string;
  token: string;
  monitoredDomains?: string[];
}

export interface HaState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
  context: { id: string };
}

export interface HaApiInfo {
  message: string;
  version?: string;
}

export interface HaServiceCallResult {
  entity_id?: string;
  state?: string;
}

const DEFAULT_MONITORED_DOMAINS = ["binary_sensor", "alert", "alarm_control_panel"];
const NOTABLE_STATES = new Set(["on", "triggered", "problem", "alarm"]);

function assertHomeAssistantConfig(config: Record<string, unknown>): HomeAssistantConfig {
  if (typeof config.baseUrl !== "string" || !config.baseUrl) {
    throw new AdapterError("VALIDATION_ERROR", "Home Assistant config missing baseUrl");
  }
  if (typeof config.token !== "string" || !config.token) {
    throw new AdapterError("VALIDATION_ERROR", "Home Assistant config missing token");
  }
  const result: HomeAssistantConfig = { baseUrl: config.baseUrl, token: config.token };
  if (Array.isArray(config.monitoredDomains)) {
    result.monitoredDomains = config.monitoredDomains as string[];
  }
  return result;
}

export class HomeAssistantAdapter implements BaseAdapter {
  readonly type = "home_assistant" as const;
  readonly connectionId: string;

  private readonly baseUrl: string;
  private readonly token: string;
  private readonly monitoredDomains: string[];

  constructor(connection: ConnectionConfig) {
    this.connectionId = connection.id;
    const cfg = assertHomeAssistantConfig(connection.config);
    this.baseUrl = cfg.baseUrl.replace(/\/$/, "");
    this.token = cfg.token;
    this.monitoredDomains = cfg.monitoredDomains ?? DEFAULT_MONITORED_DOMAINS;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    let response: Response;
    try {
      response = await fetch(url, { headers: this.headers, ...options });
    } catch (err) {
      throw new AdapterError(
        "CONNECTION_FAILED",
        `Cannot connect to Home Assistant at ${this.baseUrl}`,
        err,
        true
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new AdapterError("AUTH_FAILED", "Home Assistant authentication failed — check your long-lived access token");
    }
    if (response.status === 404) {
      throw new AdapterError("NOT_FOUND", "Resource not found in Home Assistant");
    }
    if (response.status === 429) {
      throw new AdapterError("RATE_LIMITED", "Home Assistant rate limit exceeded", undefined, true);
    }
    if (!response.ok) {
      const status = response.status;
      throw new AdapterError("EXTERNAL_ERROR", `Home Assistant responded with ${status}`, undefined, false);
    }

    return response.json() as Promise<T>;
  }

  async testConnection(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.request<HaApiInfo>("/api/");
      return { healthy: true, latencyMs: Date.now() - start, checkedAt: new Date() };
    } catch (err) {
      const message = err instanceof AdapterError ? err.message : "Unknown error";
      return { healthy: false, latencyMs: Date.now() - start, message, checkedAt: new Date() };
    }
  }

  async getStates(): Promise<HaState[]> {
    return this.request<HaState[]>("/api/states");
  }

  async getState(entityId: string): Promise<HaState> {
    return this.request<HaState>(`/api/states/${entityId}`);
  }

  async callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>
  ): Promise<HaServiceCallResult[]> {
    return this.request<HaServiceCallResult[]>(`/api/services/${domain}/${service}`, {
      method: "POST",
      body: JSON.stringify(serviceData ?? {}),
    });
  }

  getMonitoredDomains(): string[] {
    return this.monitoredDomains;
  }

  getDomain(entityId: string): string {
    return entityId.split(".")[0] ?? entityId;
  }

  isNotableState(state: HaState): boolean {
    return NOTABLE_STATES.has(state.state.toLowerCase());
  }
}
