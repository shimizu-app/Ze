import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales AI Lab",
  description: "AIアバターで商談を自動化する営業プラットフォーム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-bg text-[#f0e8ff] antialiased">{children}</body>
    </html>
  );
}
