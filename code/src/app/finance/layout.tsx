import { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/ui";

const FinanceLayout = async ({ children }: { children: ReactNode }): Promise<ReactNode> => {
  const t = await getTranslations();
  return <AppShell title={t("app.nav.finance")}>{children}</AppShell>;
};

export default FinanceLayout;
