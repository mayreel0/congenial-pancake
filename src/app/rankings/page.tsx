import { RankingType } from "@prisma/client";
import Link from "next/link";
import { getRankingSnapshots, parseNeedsEncouragementEntries, parseWarmPraiserEntries } from "@/server/rankings";

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const rankings = await getRankingSnapshots();
  const warmPraiserSnapshot = rankings.find((ranking) => ranking.rankingType === RankingType.WARM_PRAISER);
  const needsEncouragementSnapshot = rankings.find((ranking) => ranking.rankingType === RankingType.NEEDS_ENCOURAGEMENT);
  const warmPraisers = parseWarmPraiserEntries(warmPraiserSnapshot?.entries);
  const needsEncouragement = parseNeedsEncouragementEntries(needsEncouragementSnapshot?.entries);

  return (
    <section className="page-section">
      <h1>랭킹</h1>
      <p>따뜻한 참여와 지금 응원이 필요한 글을 보여줍니다.</p>
      <div className="stack-list">
        <article className="feed-item">
          <h2>따뜻한 칭찬러</h2>
          <small>{warmPraiserSnapshot ? `${warmPraiserSnapshot.period} · ${warmPraiserSnapshot.computedAt.toLocaleString("ko-KR")}` : "아직 집계 전"}</small>
          <ol className="ranking-list">
            {warmPraisers.map((entry) => (
              <li key={`${entry.nickname}-${entry.score}`}>
                <strong>{entry.nickname}</strong>
                <span>{entry.score}점</span>
              </li>
            ))}
          </ol>
          {warmPraisers.length === 0 ? <p>칭찬과 감사 반응이 쌓이면 이곳에 나타납니다.</p> : null}
        </article>
        <article className="feed-item">
          <h2>응원이 필요한 글</h2>
          <small>
            {needsEncouragementSnapshot
              ? `${needsEncouragementSnapshot.period} · ${needsEncouragementSnapshot.computedAt.toLocaleString("ko-KR")}`
              : "아직 집계 전"}
          </small>
          <div className="stack-list">
            {needsEncouragement.map((entry) => (
              <article key={entry.postId} className="ranked-post-card">
                <Link href={`/posts/${entry.postId}`}>
                  <h3>{entry.title}</h3>
                </Link>
                <small>
                  사람 칭찬 {entry.humanCommentCount}개 · {new Date(entry.createdAt).toLocaleDateString("ko-KR")}
                </small>
              </article>
            ))}
          </div>
          {needsEncouragement.length === 0 ? <p>응원이 필요한 글이 아직 집계되지 않았습니다.</p> : null}
        </article>
      </div>
    </section>
  );
}
