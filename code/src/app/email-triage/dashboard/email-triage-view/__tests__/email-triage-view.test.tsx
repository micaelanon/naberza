import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal("fetch", mockFetch);

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import EmailTriageView from "../email-triage-view";

describe("EmailTriageView (idle)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders start button when idle", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<EmailTriageView />);

    expect(screen.getByText("app.emailTriage.startBtn")).toBeDefined();
  });

  it("shows warning text", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    render(<EmailTriageView />);

    expect(screen.getByText("app.emailTriage.warning")).toBeDefined();
  });
});
