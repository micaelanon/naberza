import { getServerSession } from "next-auth";
import type { TopbarProps } from "./utils/types";
import { authOptions } from "@/lib/auth";
import "./topbar.css";

export default async function Topbar({ title }: TopbarProps) {
  const session = await getServerSession(authOptions);
  const initials = session?.user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <header className="topbar">
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__right">
        <div className="topbar__avatar" title={session?.user?.email ?? ""}>
          {initials}
        </div>
      </div>
    </header>
  );
}
