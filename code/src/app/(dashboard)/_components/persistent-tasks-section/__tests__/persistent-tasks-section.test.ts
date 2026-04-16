import { describe, it, expect } from "vitest";

import { getPriorityLabel } from "../utils/helpers";

describe("getPriorityLabel", () => {
  it("returns 'Prioridad' for high", () => {
    expect(getPriorityLabel("high")).toBe("Prioridad");
  });

  it("returns 'Seguimiento' for medium", () => {
    expect(getPriorityLabel("medium")).toBe("Seguimiento");
  });

  it("returns 'Rutina' for low", () => {
    expect(getPriorityLabel("low")).toBe("Rutina");
  });
});
