import { getRankingSnapshots } from "@/server/rankings";

export const dynamic = "force-dynamic";

function rankingTitle(type: string): string {
  return type === "WARM_PRAISER" ? "따뜻한 칭찬러" : "응원이 필요한 글";
}

function formatEntries(entries: unknown): string {
  if (Array.isArray(entries) && entries.length === 0) return "아직 집계된 항목이 없습니다.";
  return JSON.stringify(entries, null, 2);
}

export default async function RankingsPage() {
  const rankings = await getRankingSnapshots();

  return (
    <section className="page-section">
      <h1>랭킹</h1>
      <p>따뜻한 참여와 지금 응원이 필요한 글을 보여줍니다.</p>
      <div className="stack-list">
        {rankings.length > 0 ? (
          rankings.map((ranking) => (
            <article key={ranking.id} className="feed-item">
              <h2>{rankingTitle(ranking.rankingType)}</h2>
              <small>{ranking.period} · {ranking.computedAt.toLocaleString("ko-KR")}</small>
              <pre className="ranking-entries">{formatEntries(ranking.entries)}</pre>
            </article>
          ))
        ) : (
          <article className="feed-item">
            <h2>아직 랭킹이 없습니다</h2>
            <p>칭찬과 감사 반응이 쌓이면 이곳에 따뜻한 흐름이 나타납니다.</p>
          </article>
        )}
      </div>
    </section>
  );
}
