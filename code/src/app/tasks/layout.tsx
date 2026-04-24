import { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/ui";

const TasksLayout = async ({ children }: { children: ReactNode }): Promise<ReactNode> => {
  const t = await getTranslations();
  return <AppShell title={t("app.nav.tasks")}>{children}</AppShell>;
};

export default TasksLayout;
