import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "主人的任务",
  description: "把约定变成任务，让每一份认真都得到奖励。双人任务、凭证验收、奖励、抽奖与成就。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
