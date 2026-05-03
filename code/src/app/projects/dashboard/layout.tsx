import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/ui";
import { ReactNode } from "react";

const ProjectsLayout = async ({ children }: { children: ReactNode }) => {
  const t = await getTranslations("es");
  return <AppShell title={t("app.projects.title")}>{children}</AppShell>;
};

export default ProjectsLayout;
