import type { ReactNode } from "react";

export type Theme = "system" | "light" | "dark";

export interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}
