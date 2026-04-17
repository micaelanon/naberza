import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SidebarVersion from "../sidebar-version";

describe("SidebarVersion", () => {
  it("renders version label from props", () => {
    render(<SidebarVersion versionLabel="v1.2.3" />);
    expect(screen.getByText("v1.2.3")).toBeInTheDocument();
  });

  it("applies sidebar__version-label class", () => {
    render(<SidebarVersion versionLabel="v1.2.3" />);
    const label = screen.getByText("v1.2.3");
    expect(label).toHaveClass("sidebar__version-label");
  });

  it("wraps in sidebar__version container", () => {
    const { container } = render(<SidebarVersion versionLabel="v1.2.3" />);
    expect(container.firstChild).toHaveClass("sidebar__version");
  });

  it("renders labels with commit sha", () => {
    render(<SidebarVersion versionLabel="v0.0.1 · abc1234" />);
    expect(screen.getByText("v0.0.1 · abc1234")).toBeInTheDocument();
  });
});
