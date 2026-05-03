import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/ui";
import { ReactNode } from "react";

const SubsLayout = async ({ children }: { children: ReactNode }) => {
  const t = await getTranslations("es");
  return <AppShell title={t("app.subscriptions.title")}>{children}</AppShell>;
};

export default SubsLayout;
