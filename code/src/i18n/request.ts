import { getRequestConfig } from "next-intl/server";

const request = getRequestConfig(async () => ({
  locale: "es",
  messages: (await import("@/locales/shared/es.json")).default,
}));

export default request;
