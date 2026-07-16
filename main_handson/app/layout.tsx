import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simple Kanban",
  description: "小規模チームがボード / リスト / カードでタスクを管理するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
