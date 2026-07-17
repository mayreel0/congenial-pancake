import Link from "next/link";
import type { Metadata } from "next";
import { logout } from "@/app/login/actions";
import { auth } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/server/notifications";
import "./globals.css";

export const metadata: Metadata = {
  title: "칭찬",
  description: "칭찬받고 싶은 순간을 안전하게 나누는 커뮤니티"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const unreadNotificationCount = session?.user?.id ? await getUnreadNotificationCount(session.user.id) : 0;

  return (
    <html lang="ko">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">칭찬</Link>
          <nav aria-label="주요 메뉴">
            <Link href="/posts">칭찬글</Link>
            <Link href="/rankings">랭킹</Link>
            <Link href="/posts/new">글쓰기</Link>
            <Link href="/me">내 활동</Link>
            <Link href="/notifications">
              알림{unreadNotificationCount > 0 ? ` ${unreadNotificationCount}` : ""}
            </Link>
            <form action={logout}>
              <button type="submit" className="link-button">로그아웃</button>
            </form>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
