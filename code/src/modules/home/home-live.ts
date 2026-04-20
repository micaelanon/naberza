import type { HaState } from "@/lib/adapters/home-assistant";

const ATTENTION_STATES = new Set(["unknown", "unavailable", "jammed"]);
const ACCESS_DEVICE_CLASSES = new Set([
  "door",
  "opening",
  "window",
  "garage_door",
  "lock",
  "connectivity",
  "problem",
  "safety",
  "tamper",
  "smoke",
  "gas",
  "moisture",
]);
const OPEN_ACCESS_DEVICE_CLASSES = new Set(["door", "opening", "window", "garage_door", "lock"]);
const ALERT_BINARY_DEVICE_CLASSES = new Set(["problem", "safety", "tamper", "smoke", "gas", "moisture"]);
const SENSOR_KEYWORDS = ["battery", "signal", "strength", "rssi", "door", "lock", "intercom", "fermax", "nuki"];
const ENTITY_KEYWORDS = ["door", "lock", "intercom", "fermax", "nuki", "portal", "front_door"];

export interface HomeLiveEntitySummary {
  entityId: string;
  name: string;
  domain: string;
  category: "lock" | "access" | "sensor";
  state: string;
  displayState: string;
  attention: boolean;
  attentionReason: string | null;
  lastChanged: string;
  deviceClass: string | null;
  unit: string | null;
}

export interface HomeLiveOverview {
  generatedAt: string;
  totalStates: number;
  attentionItems: HomeLiveEntitySummary[];
  locks: HomeLiveEntitySummary[];
  accessPoints: HomeLiveEntitySummary[];
  sensors: HomeLiveEntitySummary[];
}

function getDomain(entityId: string): string {
  return entityId.split(".")[0] ?? entityId;
}

function getFriendlyName(state: HaState): string {
  const friendlyName = state.attributes.friendly_name;
  if (typeof friendlyName === "string" && friendlyName.trim()) return friendlyName;

  const raw = state.entity_id.split(".")[1] ?? state.entity_id;
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDeviceClass(state: HaState): string | null {
  return typeof state.attributes.device_class === "string" ? state.attributes.device_class : null;
}

function getUnit(state: HaState): string | null {
  return typeof state.attributes.unit_of_measurement === "string"
    ? state.attributes.unit_of_measurement
    : null;
}

function includesKeyword(value: string): boolean {
  const normalized = value.toLowerCase();
  return SENSOR_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isRelevantSensor(state: HaState): boolean {
  const name = getFriendlyName(state).toLowerCase();
  const entityId = state.entity_id.toLowerCase();
  const unit = getUnit(state)?.toLowerCase() ?? "";

  return includesKeyword(name)
    || SENSOR_KEYWORDS.some((keyword) => entityId.includes(keyword))
    || unit === "%"
    || unit === "dbm";
}

function isRelevantAccessPoint(state: HaState): boolean {
  const deviceClass = getDeviceClass(state);
  if (deviceClass && ACCESS_DEVICE_CLASSES.has(deviceClass)) return true;

  const haystack = `${state.entity_id} ${getFriendlyName(state)}`.toLowerCase();
  return ENTITY_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function getBinaryDisplayVariant(deviceClass: string | null): "open" | "connectivity" | "alert" | "generic" {
  if (deviceClass && OPEN_ACCESS_DEVICE_CLASSES.has(deviceClass)) return "open";
  if (deviceClass === "connectivity") return "connectivity";
  if (deviceClass && ALERT_BINARY_DEVICE_CLASSES.has(deviceClass)) return "alert";
  return "generic";
}

function formatBinaryState(rawState: string, deviceClass: string | null): string {
  if (rawState === "unavailable") return "No disponible";
  if (rawState === "unknown") return "Desconocido";

  const isOn = rawState === "on";
  const variant = getBinaryDisplayVariant(deviceClass);

  switch (variant) {
    case "open":
      return isOn ? "Abierto" : "Cerrado";
    case "connectivity":
      return isOn ? "Conectado" : "Desconectado";
    case "alert":
      return isOn ? "Alerta" : "OK";
    default:
      return isOn ? "Activo" : "Inactivo";
  }
}

function formatLockState(rawState: string): string {
  switch (rawState) {
    case "locked":
      return "Cerrada";
    case "unlocked":
      return "Abierta";
    case "locking":
      return "Cerrando";
    case "unlocking":
      return "Abriendo";
    case "jammed":
      return "Atascada";
    case "unavailable":
      return "No disponible";
    default:
      return rawState;
  }
}

function formatSensorState(rawState: string, unit: string | null): string {
  if (rawState === "unavailable") return "No disponible";
  if (rawState === "unknown") return "Desconocido";
  if (!unit) return rawState;
  return `${rawState} ${unit}`;
}

function getLockAttentionReason(rawState: string): string | null {
  if (rawState === "locked") return null;
  if (rawState === "unlocked") return "Cerradura abierta";
  if (rawState === "jammed") return "Cerradura atascada";
  return "Estado de cerradura a revisar";
}

function getBinarySensorAttentionReason(rawState: string, deviceClass: string | null): string | null {
  if (deviceClass && OPEN_ACCESS_DEVICE_CLASSES.has(deviceClass) && rawState === "on") {
    return "Acceso abierto";
  }

  if (deviceClass === "connectivity" && rawState === "off") return "Dispositivo desconectado";
  if (deviceClass && ALERT_BINARY_DEVICE_CLASSES.has(deviceClass) && rawState === "on") return "Alerta activa";

  return null;
}

function isBatterySensorName(name: string): boolean {
  return name.includes("battery") || name.includes("bater");
}

function isSignalSensorName(name: string): boolean {
  return name.includes("signal") || name.includes("rssi") || name.includes("strength");
}

function hasLowBatteryState(rawState: string, unit: string | null, numericValue: number): boolean {
  if (rawState === "low") return true;
  return unit === "%" && Number.isFinite(numericValue) && numericValue <= 20;
}

function hasWeakSignalState(numericValue: number): boolean {
  return Number.isFinite(numericValue) && numericValue <= -80;
}

function getSensorAttentionReason(rawState: string, name: string, unit: string | null): string | null {
  const numericValue = Number.parseFloat(rawState);

  if (isBatterySensorName(name) && hasLowBatteryState(rawState, unit, numericValue)) return "Batería baja";
  if (isSignalSensorName(name) && hasWeakSignalState(numericValue)) return "Señal débil";

  return null;
}

function getAttentionReason(state: HaState, domain: string, deviceClass: string | null): string | null {
  const rawState = state.state.toLowerCase();

  if (ATTENTION_STATES.has(rawState)) return "No disponible";

  if (domain === "lock") return getLockAttentionReason(rawState);
  if (domain === "binary_sensor") return getBinarySensorAttentionReason(rawState, deviceClass);
  if (domain === "sensor") return getSensorAttentionReason(rawState, getFriendlyName(state).toLowerCase(), getUnit(state));

  return null;
}

function toSummary(state: HaState, category: HomeLiveEntitySummary["category"]): HomeLiveEntitySummary {
  const domain = getDomain(state.entity_id);
  const deviceClass = getDeviceClass(state);
  const unit = getUnit(state);
  const attentionReason = getAttentionReason(state, domain, deviceClass);

  let displayState = state.state;
  if (domain === "lock") displayState = formatLockState(state.state);
  else if (domain === "binary_sensor") displayState = formatBinaryState(state.state, deviceClass);
  else if (domain === "sensor") displayState = formatSensorState(state.state, unit);

  return {
    entityId: state.entity_id,
    name: getFriendlyName(state),
    domain,
    category,
    state: state.state,
    displayState,
    attention: attentionReason !== null,
    attentionReason,
    lastChanged: state.last_changed,
    deviceClass,
    unit,
  };
}

function sortSummaries(items: HomeLiveEntitySummary[]): HomeLiveEntitySummary[] {
  return [...items].sort((a, b) => {
    if (a.attention !== b.attention) return a.attention ? -1 : 1;
    return a.name.localeCompare(b.name, "es");
  });
}

export function buildHomeLiveOverview(states: HaState[]): HomeLiveOverview {
  const locks = states
    .filter((state) => getDomain(state.entity_id) === "lock")
    .map((state) => toSummary(state, "lock"));

  const accessPoints = states
    .filter((state) => getDomain(state.entity_id) === "binary_sensor")
    .filter(isRelevantAccessPoint)
    .map((state) => toSummary(state, "access"));

  const sensors = states
    .filter((state) => getDomain(state.entity_id) === "sensor")
    .filter(isRelevantSensor)
    .map((state) => toSummary(state, "sensor"));

  const attentionItems = sortSummaries([
    ...locks.filter((item) => item.attention),
    ...accessPoints.filter((item) => item.attention),
    ...sensors.filter((item) => item.attention),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    totalStates: states.length,
    attentionItems,
    locks: sortSummaries(locks),
    accessPoints: sortSummaries(accessPoints),
    sensors: sortSummaries(sensors),
  };
}
