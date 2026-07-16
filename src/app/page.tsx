import Link from "next/link";
import { listRecentPosts } from "@/server/posts";

export const dynamic = "force-dynamic";

function publicName(displayMode: string, nickname: string) {
  return displayMode === "ANONYMOUS" ? "익명" : nickname;
}

export default async function HomePage() {
  const posts = await listRecentPosts(5);

  return (
    <section className="page-section">
      <div className="section-heading-row">
        <div>
          <h1>칭찬</h1>
          <p>칭찬받고 싶은 순간을 쓰고, 서로의 작은 완료를 다정하게 알아봅니다.</p>
        </div>
        <Link href="/posts">칭찬글 보기</Link>
      </div>
      <div className="action-row">
        <Link href="/posts/new">글쓰기</Link>
        <Link href="/rankings">랭킹 보기</Link>
        <Link href="/me">내 활동</Link>
      </div>
      <h2>최근 칭찬글</h2>
      <div className="feed-list">
        {posts.map((post) => {
          const humanCount = post.comments.filter((comment) => !comment.isAiGenerated).length;
          const aiCount = post.comments.length - humanCount;
          return (
            <article key={post.id} className="feed-item">
              <Link href={`/posts/${post.id}`}>
                <h2>{post.title}</h2>
              </Link>
              <p>{post.body.slice(0, 120)}</p>
              <small>
                {publicName(post.displayMode, post.author.nickname)} · 사람 {humanCount} · 칭찬러 {aiCount}
              </small>
            </article>
          );
        })}
        {posts.length === 0 ? <p>아직 올라온 글이 없습니다.</p> : null}
      </div>
    </section>
  );
}
