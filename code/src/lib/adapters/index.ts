export { adapterRegistry, AdapterRegistry } from "./adapter-registry";
export { AdapterError } from "./adapter-types";
export type {
  BaseAdapter,
  ConnectionConfig,
  ConnectionType,
  ConnectionStatus,
  ConnectionPermissions,
  HealthCheckResult,
  AdapterErrorCode,
} from "./adapter-types";
export { PaperlessAdapter, syncPaperlessDocuments } from "./paperless";
export { HomeAssistantAdapter, syncHomeAssistantAlerts } from "./home-assistant";
export type { HomeAssistantConfig, HaState, HaSyncResult } from "./home-assistant";

