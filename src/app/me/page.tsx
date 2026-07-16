import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePageParam, normalizeSortParam, postPageSize, sortToOrder, type PostSort } from "@/server/posts";

export const dynamic = "force-dynamic";

function activityHref(params: { postsPage: number; commentsPage: number; sort: PostSort }) {
  return `/me?postsPage=${params.postsPage}&commentsPage=${params.commentsPage}&sort=${params.sort}`;
}

export default async function MyActivityPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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

  const params = await searchParams;
  const postsPage = normalizePageParam(params.postsPage);
  const commentsPage = normalizePageParam(params.commentsPage);
  const sort = normalizeSortParam(params.sort);
  const order = sortToOrder(sort);

  const [user, totalPosts, totalComments] = await Promise.all([
    db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: {
      posts: {
        orderBy: { createdAt: order },
        skip: (postsPage - 1) * postPageSize,
        take: postPageSize
      },
      comments: {
        orderBy: { createdAt: order },
        skip: (commentsPage - 1) * postPageSize,
        take: postPageSize,
        include: { post: { select: { id: true, title: true } } }
      }
    }
    }),
    db.praisePost.count({ where: { authorUserId: session.user.id } }),
    db.praiseComment.count({ where: { authorUserId: session.user.id } })
  ]);
  const totalPostPages = Math.max(1, Math.ceil(totalPosts / postPageSize));
  const totalCommentPages = Math.max(1, Math.ceil(totalComments / postPageSize));

  return (
    <section className="page-section">
      <h1>내 활동</h1>
      <p>신뢰 점수 {user.trustScore} · 상태 {user.sanctionState}</p>
      <div className="filter-row" aria-label="내 활동 정렬">
        <Link aria-current={sort === "latest" ? "page" : undefined} href={activityHref({ postsPage: 1, commentsPage: 1, sort: "latest" })}>
          최신순
        </Link>
        <Link aria-current={sort === "oldest" ? "page" : undefined} href={activityHref({ postsPage: 1, commentsPage: 1, sort: "oldest" })}>
          오래된순
        </Link>
      </div>

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
      <nav aria-label="내가 쓴 글 페이지" className="pagination-row">
        <Link aria-disabled={postsPage <= 1} href={activityHref({ postsPage: Math.max(1, postsPage - 1), commentsPage, sort })}>
          이전
        </Link>
        <span>
          {postsPage} / {totalPostPages}
        </span>
        <Link
          aria-disabled={postsPage >= totalPostPages}
          href={activityHref({ postsPage: Math.min(totalPostPages, postsPage + 1), commentsPage, sort })}
        >
          다음
        </Link>
      </nav>

      <h2>내가 쓴 칭찬</h2>
      <div className="stack-list">
        {user.comments.length > 0 ? (
          user.comments.map((comment) => (
            <article key={comment.id} className="feed-item">
              <p>{comment.body}</p>
              <small>
                <Link href={`/posts/${comment.post.id}`}>{comment.post.title}</Link> · {comment.visibilityState} ·{" "}
                {comment.createdAt.toLocaleString("ko-KR")}
              </small>
            </article>
          ))
        ) : (
          <p>아직 남긴 칭찬이 없습니다.</p>
        )}
      </div>
      <nav aria-label="내가 쓴 칭찬 페이지" className="pagination-row">
        <Link aria-disabled={commentsPage <= 1} href={activityHref({ postsPage, commentsPage: Math.max(1, commentsPage - 1), sort })}>
          이전
        </Link>
        <span>
          {commentsPage} / {totalCommentPages}
        </span>
        <Link
          aria-disabled={commentsPage >= totalCommentPages}
          href={activityHref({ postsPage, commentsPage: Math.min(totalCommentPages, commentsPage + 1), sort })}
        >
          다음
        </Link>
      </nav>
    </section>
  );
}
