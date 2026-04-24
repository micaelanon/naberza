"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
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
};

const SettingsView = (): ReactNode  => {
  const t = useTranslations();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [theme, setTheme] = useState<Theme>("system");

  const handleThemeChange = useCallback((next: Theme) => {
    setTheme(next);
    showToast(t("app.settings.themeChanged", { theme: THEME_TOAST[next] }));
  }, [showToast, t]);

  const handleCopyVersion = useCallback(async () => {
    await navigator.clipboard.writeText(APP_VERSION);
    showToast(t("app.settings.versionCopied"));
  }, [showToast, t]);

  return (
    <div className="page-container settings-page">
      <div className="page-header">
        <h1>{t("app.settings.title")}</h1>
      </div>

      <Section title={t("app.settings.account")}>
        <div className="settings-row">
          <span className="settings-row__label">{t("app.common.user")}</span>
          <span className="settings-row__value">{session?.user?.name ?? t("app.settings.userFallback")}</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">{t("app.common.email")}</span>
          <span className="settings-row__value">{session?.user?.email ?? t("app.settings.userFallback")}</span>
        </div>
      </Section>

      <Section title={t("app.settings.appearance")}>
        <div className="settings-row settings-row--theme">
          <span className="settings-row__label">{t("app.common.theme")}</span>
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

      <Section title={t("app.common.system")}>
        <div className="settings-row">
          <span className="settings-row__label">{t("app.common.version")}</span>
          <span className="settings-row__value">
            {APP_VERSION}
            <button
              type="button"
              className="settings-copy-btn"
              onClick={() => void handleCopyVersion()}
              title={t("app.settings.copyVersionTitle")}
            >
              <span className="material-symbols-outlined">content_copy</span>
            </button>
          </span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">{t("app.settings.database")}</span>
          <span className="settings-row__value">{t("app.settings.databaseValue")}</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">{t("app.settings.runtime")}</span>
          <span className="settings-row__value">{t("app.settings.runtimeValue")}</span>
        </div>
      </Section>
    </div>
  );
};

export default SettingsView;
