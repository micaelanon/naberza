import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "naBerza",
  description: "Sistema personal de tareas, recordatorios y citas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
