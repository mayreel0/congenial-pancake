import Link from "next/link";
import { listPostsPage, normalizePageParam, normalizeSortParam, type PostSort } from "@/server/posts";

export const dynamic = "force-dynamic";

function publicName(displayMode: string, nickname: string) {
  return displayMode === "ANONYMOUS" ? "익명" : nickname;
}

function pageHref(page: number, sort: PostSort) {
  return `/posts?page=${page}&sort=${sort}`;
}

function sortHref(sort: PostSort) {
  return `/posts?page=1&sort=${sort}`;
}

export default async function PostsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = normalizePageParam(params.page);
  const sort = normalizeSortParam(params.sort);
  const postsPage = await listPostsPage({ page, sort });

  return (
    <section className="page-section">
      <div className="section-heading-row">
        <div>
          <h1>칭찬받고 싶은 순간들</h1>
          <p>지금 칭찬이 필요한 글을 날짜순으로 살펴봅니다.</p>
        </div>
        <Link href="/posts/new">글쓰기</Link>
      </div>
      <div className="filter-row" aria-label="정렬">
        <Link aria-current={sort === "latest" ? "page" : undefined} href={sortHref("latest")}>
          최신순
        </Link>
        <Link aria-current={sort === "oldest" ? "page" : undefined} href={sortHref("oldest")}>
          오래된순
        </Link>
      </div>
      <div className="feed-list">
        {postsPage.posts.map((post) => {
          const humanCount = post.comments.filter((comment) => !comment.isAiGenerated).length;
          const aiCount = post.comments.length - humanCount;
          return (
            <article key={post.id} className="feed-item">
              <Link href={`/posts/${post.id}`}>
                <h2>{post.title}</h2>
              </Link>
              <p>{post.body.slice(0, 120)}</p>
              <small>
                {publicName(post.displayMode, post.author.nickname)} · {post.createdAt.toLocaleString("ko-KR")} · 사람{" "}
                {humanCount} · 칭찬러 {aiCount}
              </small>
            </article>
          );
        })}
        {postsPage.posts.length === 0 ? <p>아직 올라온 글이 없습니다.</p> : null}
      </div>
      <nav aria-label="칭찬글 페이지" className="pagination-row">
        <Link aria-disabled={page <= 1} href={pageHref(Math.max(1, page - 1), sort)}>
          이전
        </Link>
        <span>
          {postsPage.page} / {postsPage.totalPages}
        </span>
        <Link aria-disabled={page >= postsPage.totalPages} href={pageHref(Math.min(postsPage.totalPages, page + 1), sort)}>
          다음
        </Link>
      </nav>
    </section>
  );
}
