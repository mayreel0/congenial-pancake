import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ModerationPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return <section className="page-section"><h1>로그인이 필요합니다</h1></section>;
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.isModerator) {
    return <section className="page-section"><h1>운영자만 접근할 수 있습니다</h1></section>;
  }

  const heldComments = await db.praiseComment.findMany({
    where: { visibilityState: { in: ["HELD", "AUTHOR_ONLY", "HIDDEN"] } },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <section className="page-section">
      <h1>운영 검토</h1>
      {heldComments.map((comment) => (
        <article key={comment.id}>
          <p>{comment.body}</p>
          <small>{comment.visibilityState} · risk {comment.moderationRisk}</small>
        </article>
      ))}
    </section>
  );
}
