import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MyActivityPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <section className="page-section">
        <h1>로그인이 필요합니다</h1>
        <p>내 활동은 인증된 계정만 볼 수 있습니다.</p>
        <Link href="/login">로그인</Link>
      </section>
    );
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: {
      posts: { orderBy: { createdAt: "desc" }, take: 10 },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { post: { select: { id: true, title: true } } }
      }
    }
  });

  return (
    <section className="page-section">
      <h1>내 활동</h1>
      <p>신뢰 점수 {user.trustScore} · 상태 {user.sanctionState}</p>

      <h2>내가 쓴 글</h2>
      <div className="stack-list">
        {user.posts.length > 0 ? (
          user.posts.map((post) => (
            <article key={post.id} className="feed-item">
              <Link href={`/posts/${post.id}`}>{post.title}</Link>
              <small>{post.status} · {post.createdAt.toLocaleString("ko-KR")}</small>
            </article>
          ))
        ) : (
          <p>아직 올린 글이 없습니다.</p>
        )}
      </div>

      <h2>내가 쓴 칭찬</h2>
      <div className="stack-list">
        {user.comments.length > 0 ? (
          user.comments.map((comment) => (
            <article key={comment.id} className="feed-item">
              <p>{comment.body}</p>
              <small>{comment.post.title} · {comment.visibilityState}</small>
            </article>
          ))
        ) : (
          <p>아직 남긴 칭찬이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
