import type { ShellProps } from "./utils/types";
import "./shell.css";

export default function Shell({ children }: ShellProps) {
  return (
    <div className="shell">
      <div className="shell__inner">{children}</div>
    </div>
  );
}
