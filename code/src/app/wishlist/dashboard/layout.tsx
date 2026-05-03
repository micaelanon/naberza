import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/ui";
import { ReactNode } from "react";

const WishlistLayout = async ({ children }: { children: ReactNode }) => {
  const t = await getTranslations("es");
  return <AppShell title={t("app.wishlist.title")}>{children}</AppShell>;
};

export default WishlistLayout;
