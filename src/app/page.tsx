import Link from "next/link";
import { listFeedPosts } from "@/server/posts";

export const dynamic = "force-dynamic";

function publicName(displayMode: string, nickname: string) {
  return displayMode === "ANONYMOUS" ? "익명" : nickname;
}

export default async function HomePage() {
  const posts = await listFeedPosts();

  return (
    <section className="page-section">
      <h1>칭찬받고 싶은 순간들</h1>
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
                {publicName(post.displayMode, post.author.nickname)} · 사람 {humanCount} · AI {aiCount}
              </small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
