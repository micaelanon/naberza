"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui";
import type { ReactNode } from "react";

import type { SettingsSectionProps, Theme } from "./utils/types";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

const THEME_LABELS: Record<Theme, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Oscuro",
};

const THEME_TOAST: Record<Theme, string> = {
  system: "sistema",
  light: "claro",
  dark: "oscuro",
};

const Section = ({ title, children }: SettingsSectionProps): ReactNode  => {
  return (
    <div className="settings-section">
      <h2 className="settings-section__title">{title}</h2>
      <div className="settings-section__body">{children}</div>
    </div>
  );
}

const SettingsView = (): ReactNode  => {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [theme, setTheme] = useState<Theme>("system");

  const handleThemeChange = (next: Theme) => {
    setTheme(next);
    showToast(`Tema cambiado a ${THEME_TOAST[next]}`);
  };

  const handleCopyVersion = async () => {
    await navigator.clipboard.writeText(APP_VERSION);
    showToast("Versión copiada");
  };

  return (
    <div className="page-container settings-page">
      <div className="page-header">
        <h1>Ajustes</h1>
      </div>

      <Section title="Cuenta">
        <div className="settings-row">
          <span className="settings-row__label">Usuario</span>
          <span className="settings-row__value">{session?.user?.name ?? "—"}</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Email</span>
          <span className="settings-row__value">{session?.user?.email ?? "—"}</span>
        </div>
      </Section>

      <Section title="Apariencia">
        <div className="settings-row settings-row--theme">
          <span className="settings-row__label">Tema</span>
          <div className="settings-theme-options">
            {(["system", "light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`settings-theme-btn${theme === t ? " settings-theme-btn--active" : ""}`}
                onClick={() => handleThemeChange(t)}
              >
                {THEME_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Sistema">
        <div className="settings-row">
          <span className="settings-row__label">Versión</span>
          <span className="settings-row__value">
            {APP_VERSION}
            <button
              type="button"
              className="settings-copy-btn"
              onClick={() => void handleCopyVersion()}
              title="Copiar versión"
            >
              <span className="material-symbols-outlined">content_copy</span>
            </button>
          </span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Base de datos</span>
          <span className="settings-row__value">PostgreSQL 16</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Runtime</span>
          <span className="settings-row__value">Next.js 16 / React 19</span>
        </div>
      </Section>
    </div>
  );
}

export default SettingsView;
