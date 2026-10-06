// FR-BOARD-001, FR-LIST-001
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Simple Kanban" };
export default function Layout({ children }: { children: React.ReactNode }) {return <html lang="ja"><body>{children}</body></html>;}
