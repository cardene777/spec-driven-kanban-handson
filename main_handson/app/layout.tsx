import type { Metadata } from "next";
import "./globals.css";

// ブランド方針: system font stack（Google Fonts は使わない）。フォントは tokens.css / globals.css で定義。
export const metadata: Metadata = {
  title: "Simple Kanban",
  description: "小規模チーム向けカンバンアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
