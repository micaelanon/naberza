import Sidebar from "@/components/ui/sidebar";
import Topbar from "@/components/ui/topbar";
import "./app-shell.css";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
}

export default function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <Topbar title={title} />
        <div className="app-shell__content">{children}</div>
      </div>
    </div>
  );
}
