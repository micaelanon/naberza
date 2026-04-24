import { getRequestConfig } from "next-intl/server";

const i18n = getRequestConfig(async () => ({
  locale: "es",
  messages: (await import("./locales/shared/es.json")).default,
}));

export default i18n;
