import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGetAppVersion = vi.hoisted(() => vi.fn(() => "1.2.3"));

vi.mock("@/lib/app-version", () => ({
  getAppVersion: mockGetAppVersion,
}));

import SidebarVersion from "../sidebar-version";

describe("SidebarVersion", () => {
  it("renders version from getAppVersion", () => {
    render(<SidebarVersion />);
    expect(screen.getByText("v1.2.3")).toBeInTheDocument();
  });

  it("applies sidebar__version-label class", () => {
    render(<SidebarVersion />);
    const label = screen.getByText("v1.2.3");
    expect(label).toHaveClass("sidebar__version-label");
  });

  it("wraps in sidebar__version container", () => {
    const { container } = render(<SidebarVersion />);
    expect(container.firstChild).toHaveClass("sidebar__version");
  });

  it("renders different version strings", () => {
    mockGetAppVersion.mockReturnValueOnce("0.9.0");
    render(<SidebarVersion />);
    expect(screen.getByText("v0.9.0")).toBeInTheDocument();
  });
});
