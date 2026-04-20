import { describe, expect, it } from "vitest";
import { buildHomeLiveOverview } from "../home-live";
import type { HaState } from "@/lib/adapters/home-assistant";

function makeState(overrides: Partial<HaState> = {}): HaState {
  return {
    entity_id: "sensor.test",
    state: "42",
    attributes: {},
    last_changed: "2026-04-20T20:00:00Z",
    last_updated: "2026-04-20T20:00:00Z",
    context: { id: "ctx-1" },
    ...overrides,
  };
}

describe("buildHomeLiveOverview", () => {
  it("includes all lock entities and flags unlocked ones for attention", () => {
    const overview = buildHomeLiveOverview([
      makeState({
        entity_id: "lock.front_door",
        state: "unlocked",
        attributes: { friendly_name: "Puerta principal" },
      }),
    ]);

    expect(overview.locks).toHaveLength(1);
    expect(overview.locks[0]).toMatchObject({
      name: "Puerta principal",
      displayState: "Abierta",
      attention: true,
      attentionReason: "Cerradura abierta",
    });
    expect(overview.attentionItems).toHaveLength(1);
  });

  it("maps binary door sensors to readable access states", () => {
    const overview = buildHomeLiveOverview([
      makeState({
        entity_id: "binary_sensor.portal",
        state: "on",
        attributes: { friendly_name: "Portal", device_class: "door" },
      }),
    ]);

    expect(overview.accessPoints[0]).toMatchObject({
      displayState: "Abierto",
      attention: true,
      attentionReason: "Acceso abierto",
    });
  });

  it("flags disconnected connectivity sensors", () => {
    const overview = buildHomeLiveOverview([
      makeState({
        entity_id: "binary_sensor.nuki_connectivity",
        state: "off",
        attributes: { friendly_name: "Nuki connectivity", device_class: "connectivity" },
      }),
    ]);

    expect(overview.accessPoints[0]).toMatchObject({
      displayState: "Desconectado",
      attention: true,
      attentionReason: "Dispositivo desconectado",
    });
  });

  it("keeps relevant sensors and detects low battery", () => {
    const overview = buildHomeLiveOverview([
      makeState({
        entity_id: "sensor.nuki_battery",
        state: "15",
        attributes: { friendly_name: "Nuki Battery", unit_of_measurement: "%" },
      }),
      makeState({
        entity_id: "sensor.kitchen_temperature",
        state: "21.5",
        attributes: { friendly_name: "Kitchen temperature", unit_of_measurement: "°C" },
      }),
    ]);

    expect(overview.sensors).toHaveLength(1);
    expect(overview.sensors[0]).toMatchObject({
      name: "Nuki Battery",
      displayState: "15 %",
      attention: true,
      attentionReason: "Batería baja",
    });
  });

  it("keeps weak signal sensors visible and marked for attention", () => {
    const overview = buildHomeLiveOverview([
      makeState({
        entity_id: "sensor.fermax_signal_strength",
        state: "-89",
        attributes: { friendly_name: "Fermax signal strength", unit_of_measurement: "dBm" },
      }),
    ]);

    expect(overview.sensors[0]).toMatchObject({
      displayState: "-89 dBm",
      attention: true,
      attentionReason: "Señal débil",
    });
  });
});
