import { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/ui";

const InvoicesLayout = async ({ children }: { children: ReactNode }): Promise<ReactNode> => {
  const t = await getTranslations();
  return <AppShell title={t("app.nav.invoices")}>{children}</AppShell>;
};

export default InvoicesLayout;
