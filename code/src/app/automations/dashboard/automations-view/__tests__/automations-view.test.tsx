import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", mockFetch);

import AutomationsView from "../automations-view";
import type { AutomationRuleSummary, ApprovalRequestSummary } from "@/modules/automations";

const mockRule: AutomationRuleSummary = {
  id: "rule-1",
  name: "Flag large invoices",
  description: "Flags invoices over 1000 EUR",
  triggerEvent: "invoice.created",
  conditionCount: 1,
  actionCount: 2,
  requiresApproval: true,
  enabled: true,
  priority: 1,
  executionCount: 5,
  lastTriggeredAt: null,
};

const mockApproval: ApprovalRequestSummary = {
  id: "appr-1",
  automationRuleId: "rule-1",
  automationRuleName: "Flag large invoices",
  status: "PENDING",
  proposedActions: [{ type: "create_task", params: {} }, { type: "send_notification", params: {} }],
  expiresAt: new Date(Date.now() + 86400000),
  createdAt: new Date(),
};

function makeOkResponse<T>(data: T, total = 1) {
  return {
    ok: true,
    json: () => Promise.resolve({ data, total }),
  };
}

describe("AutomationsView", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders rules and approvals after loading", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse([mockRule]))
      .mockResolvedValueOnce(makeOkResponse([mockApproval]));

    render(<AutomationsView />);
    await waitFor(() => {
      expect(screen.getAllByText("Flag large invoices")).not.toHaveLength(0);
    });
    expect(screen.getByText("Aprobaciones pendientes")).toBeInTheDocument();
  });

  it("shows empty state when no rules", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse([]))
      .mockResolvedValueOnce(makeOkResponse([]));

    render(<AutomationsView />);
    await waitFor(() => {
      expect(screen.getByText(/No hay reglas/i)).toBeInTheDocument();
    });
  });

  it("shows pending badge when there are pending approvals", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse([mockRule]))
      .mockResolvedValueOnce(makeOkResponse([mockApproval]));

    render(<AutomationsView />);
    await waitFor(() => {
      expect(screen.getByText(/1 pending/)).toBeInTheDocument();
    });
  });

  it("shows error when fetch fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    render(<AutomationsView />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load automations/)).toBeInTheDocument();
    });
  });

  it("shows rule trigger event", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse([mockRule]))
      .mockResolvedValueOnce(makeOkResponse([]));

    render(<AutomationsView />);
    await waitFor(() => {
      expect(screen.getByText("invoice.created")).toBeInTheDocument();
    });
  });

  it("shows requires approval flag on rule", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse([mockRule]))
      .mockResolvedValueOnce(makeOkResponse([]));

    render(<AutomationsView />);
    await waitFor(() => {
      expect(screen.getByText("requires approval")).toBeInTheDocument();
    });
  });

  it("shows grant and deny buttons for pending approvals", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse([]))
      .mockResolvedValueOnce(makeOkResponse([mockApproval]));

    render(<AutomationsView />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Grant" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Deny" })).toBeInTheDocument();
    });
  });

  it("calls grant API and reloads when Grant clicked", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse([]))
      .mockResolvedValueOnce(makeOkResponse([mockApproval]))
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce(makeOkResponse([]))
      .mockResolvedValueOnce(makeOkResponse([]));

    render(<AutomationsView />);
    const grantBtn = await screen.findByRole("button", { name: "Grant" });
    fireEvent.click(grantBtn);

    await waitFor(() => {
      const postCall = mockFetch.mock.calls.find(
        (c) => (c[0] as string).includes("grant") && (c[1] as RequestInit)?.method === "POST",
      );
      expect(postCall).toBeDefined();
    });
  });

  it("disables buttons while processing", async () => {
    let resolveGrant!: () => void;
    const grantPromise = new Promise<void>((res) => { resolveGrant = res; });

    mockFetch
      .mockResolvedValueOnce(makeOkResponse([]))
      .mockResolvedValueOnce(makeOkResponse([mockApproval]))
      .mockReturnValueOnce({ ok: true, json: () => grantPromise.then(() => ({})) });

    render(<AutomationsView />);
    const grantBtn = await screen.findByRole("button", { name: "Grant" });
    fireEvent.click(grantBtn);
    expect(grantBtn).toBeDisabled();
    resolveGrant();
  });
});
