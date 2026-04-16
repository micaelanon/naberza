/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ConnectionType, HealthCheckResult } from "../../providers";

import { NotImplementedError } from "../not-implemented-error";
import type {
  HomeAutomationProvider,
  HomeProviderCapabilities,
  ServiceSafety,
  EntityState,
  HistoryParams,
  StateHistoryEntry,
  EventListParams,
  HomeEventExternal,
  Unsubscribe,
} from "../../providers";

/**
 * Home Assistant provider stub.
 *
 * API: REST + WebSocket at <ha-url>/api/
 * Auth: Long-lived access token (Authorization: Bearer <token>)
 * Default permissions: read-only states and events
 *
 * Service safety defaults:
 * - safe: light.turn_on/off, media_player.* (informational actions)
 * - moderate: climate.set_temperature, switch.toggle
 * - sensitive: lock.unlock, alarm_control_panel.disarm (always require approval)
 *
 * Implementation target: Phase 3
 * Reference: docs/integrations.md — Home Assistant Integration Details
 */
export class HomeAssistantAdapter implements HomeAutomationProvider {
  readonly type: ConnectionType = "HOME_ASSISTANT";
  readonly connectionId: string;

  readonly capabilities: HomeProviderCapabilities = {
    canReadStates: true,
    canReadHistory: true,
    canCallServices: true,
    canSubscribeEvents: true,
    supportedDomains: ["light", "switch", "sensor", "climate", "lock", "alarm_control_panel", "media_player"],
  };

  readonly serviceSafetyMap: ServiceSafety[] = [
    { domain: "light", service: "turn_on", level: "safe", requiresApproval: false, description: "Turn on a light" },
    { domain: "light", service: "turn_off", level: "safe", requiresApproval: false, description: "Turn off a light" },
    { domain: "switch", service: "toggle", level: "moderate", requiresApproval: false, description: "Toggle a switch" },
    { domain: "climate", service: "set_temperature", level: "moderate", requiresApproval: false, description: "Set thermostat temperature" },
    { domain: "lock", service: "unlock", level: "sensitive", requiresApproval: true, description: "Unlock a door" },
    { domain: "alarm_control_panel", service: "disarm", level: "sensitive", requiresApproval: true, description: "Disarm alarm system" },
  ];

  constructor(connectionId: string) {
    this.connectionId = connectionId;
  }

  async getStates(): Promise<EntityState[]> {
    throw new NotImplementedError("HomeAssistantAdapter", "getStates");
  }

  async getEntityState(_entityId: string): Promise<EntityState | null> {
    throw new NotImplementedError("HomeAssistantAdapter", "getEntityState");
  }

  async getHistory(_entityId: string, _params: HistoryParams): Promise<StateHistoryEntry[]> {
    throw new NotImplementedError("HomeAssistantAdapter", "getHistory");
  }

  async getEvents(_params?: EventListParams): Promise<HomeEventExternal[]> {
    throw new NotImplementedError("HomeAssistantAdapter", "getEvents");
  }

  async callService(_domain: string, _service: string, _data?: Record<string, unknown>): Promise<void> {
    throw new NotImplementedError("HomeAssistantAdapter", "callService");
  }

  getServiceSafety(domain: string, service: string): ServiceSafety | null {
    return this.serviceSafetyMap.find((s) => s.domain === domain && s.service === service) ?? null;
  }

  async subscribeEvents(_callback: (event: HomeEventExternal) => void): Promise<Unsubscribe> {
    throw new NotImplementedError("HomeAssistantAdapter", "subscribeEvents");
  }

  async testConnection(): Promise<HealthCheckResult> {
    return {
      healthy: false,
      latencyMs: 0,
      message: "HomeAssistantAdapter not yet implemented (Phase 3)",
      checkedAt: new Date(),
    };
  }
}
