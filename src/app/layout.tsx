import Link from "next/link";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "전긍정",
  description: "칭찬받고 싶은 순간을 안전하게 나누는 커뮤니티"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">전긍정</Link>
          <nav aria-label="주요 메뉴">
            <a href="/rankings">랭킹</a>
            <a href="/posts/new">글쓰기</a>
            <a href="/me">내 활동</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
