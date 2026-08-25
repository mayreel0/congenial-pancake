import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "./lib/query/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "온설 관리",
  description: "온설 신고 검토",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
