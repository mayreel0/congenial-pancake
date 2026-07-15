import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAiControlSetting, getTodayAiUsage, updateAiControlSetting } from "@/server/ai-controls";
import { revalidatePath } from "next/cache";

async function updateAiControls(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.id) throw new Error("AUTH_REQUIRED");
  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.isModerator) throw new Error("MODERATOR_REQUIRED");

  await updateAiControlSetting({
    enabled: formData.get("enabled") === "on",
    dailyJobLimit: Number(formData.get("dailyJobLimit")),
    dailyCommentLimit: Number(formData.get("dailyCommentLimit"))
  });
  revalidatePath("/moderation");
}

export default async function ModerationPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return <section className="page-section"><h1>로그인이 필요합니다</h1></section>;
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.isModerator) {
    return <section className="page-section"><h1>운영자만 접근할 수 있습니다</h1></section>;
  }

  const [heldComments, aiSetting, aiUsage] = await Promise.all([
    db.praiseComment.findMany({
      where: { visibilityState: { in: ["HELD", "AUTHOR_ONLY", "HIDDEN"] } },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    getAiControlSetting(),
    getTodayAiUsage()
  ]);

  return (
    <section className="page-section">
      <h1>운영 검토</h1>
      <section className="moderation-panel">
        <div>
          <h2>AI 칭찬 제어</h2>
          <p>오늘 AI 작업 {aiUsage.executedJobs}건 · 생성 댓글 {aiUsage.generatedComments}개 · 스킵 {aiUsage.skippedJobs}건 · 실패 {aiUsage.failedJobs}건</p>
        </div>
        <form action={updateAiControls} className="settings-form">
          <label className="checkbox-label">
            <input name="enabled" type="checkbox" defaultChecked={aiSetting.enabled} />
            AI 칭찬 사용
          </label>
          <label>
            하루 작업 제한
            <input name="dailyJobLimit" type="number" min="0" max="10000" defaultValue={aiSetting.dailyJobLimit} />
          </label>
          <label>
            하루 댓글 제한
            <input
              name="dailyCommentLimit"
              type="number"
              min="0"
              max="10000"
              defaultValue={aiSetting.dailyCommentLimit}
            />
          </label>
          <button type="submit">저장</button>
        </form>
      </section>
      {heldComments.map((comment) => (
        <article key={comment.id}>
          <p>{comment.body}</p>
          <small>{comment.visibilityState} · risk {comment.moderationRisk}</small>
        </article>
      ))}
    </section>
  );
}
