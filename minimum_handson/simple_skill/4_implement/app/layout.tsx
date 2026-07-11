import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simple Kanban",
  description: "最小構成のカンバンアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
