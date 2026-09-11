import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leilão OS",
  description: "Sistema operacional privado de decisão para investimento em leilões imobiliários",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans text-sm">{children}</body>
    </html>
  );
}
