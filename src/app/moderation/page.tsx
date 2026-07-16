import { ReportStatus, VisibilityState } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getAiControlSetting,
  getTodayAiUsage,
  listTodayAiUsageEvents,
  updateAiControlSetting
} from "@/server/ai-controls";
import { applyTrustDelta, reviewCommentVisibility, reviewReport } from "@/server/moderation";
import { recomputeRankingSnapshots } from "@/server/rankings";
import { revalidatePath } from "next/cache";

type ReviewableReportStatus = Extract<ReportStatus, "REVIEWED" | "DISMISSED">;

async function requireModeratorUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("AUTH_REQUIRED");
  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.isModerator) throw new Error("MODERATOR_REQUIRED");
  return user.id;
}

async function updateAiControls(formData: FormData) {
  "use server";

  await requireModeratorUserId();

  await updateAiControlSetting({
    enabled: formData.get("enabled") === "on",
    dailyJobLimit: Number(formData.get("dailyJobLimit")),
    dailyCommentLimit: Number(formData.get("dailyCommentLimit"))
  });
  revalidatePath("/moderation");
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("MODERATION_ACTION_INVALID");
  }
  return value.trim();
}

function parseVisibilityState(value: string): VisibilityState {
  if (value === VisibilityState.VISIBLE || value === VisibilityState.HIDDEN || value === VisibilityState.AUTHOR_ONLY) {
    return value;
  }
  throw new Error("MODERATION_ACTION_INVALID");
}

function parseReportStatus(value: string): ReviewableReportStatus {
  if (value === ReportStatus.REVIEWED || value === ReportStatus.DISMISSED) {
    return value;
  }
  throw new Error("MODERATION_ACTION_INVALID");
}

async function reviewCommentAction(formData: FormData) {
  "use server";

  const moderatorId = await requireModeratorUserId();
  await reviewCommentVisibility({
    moderatorId,
    commentId: formString(formData, "commentId"),
    visibilityState: parseVisibilityState(formString(formData, "visibilityState")),
    reason: formString(formData, "reason")
  });
  revalidatePath("/moderation");
}

async function reviewReportAction(formData: FormData) {
  "use server";

  const moderatorId = await requireModeratorUserId();
  await reviewReport({
    moderatorId,
    reportId: formString(formData, "reportId"),
    status: parseReportStatus(formString(formData, "status")),
    reason: formString(formData, "reason")
  });
  revalidatePath("/moderation");
}

async function adjustTrustAction(formData: FormData) {
  "use server";

  await requireModeratorUserId();
  await applyTrustDelta(
    formString(formData, "userId"),
    Number(formString(formData, "delta")),
    formString(formData, "reason")
  );
  revalidatePath("/moderation");
}

async function recomputeRankingsAction() {
  "use server";

  await requireModeratorUserId();
  await recomputeRankingSnapshots();
  revalidatePath("/rankings");
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

  const [heldComments, reports, aiSetting, aiUsage, aiUsageEvents] = await Promise.all([
    db.praiseComment.findMany({
      where: { visibilityState: { in: ["HELD", "AUTHOR_ONLY", "HIDDEN"] } },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    db.report.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    getAiControlSetting(),
    getTodayAiUsage(),
    listTodayAiUsageEvents()
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
      <section className="moderation-panel">
        <h2>보류 댓글</h2>
        <div className="stack-list">
          {heldComments.map((comment) => (
            <article className="review-item" key={comment.id}>
              <p>{comment.body}</p>
              <small>{comment.visibilityState} · risk {comment.moderationRisk}</small>
              <div className="action-row">
                <form action={reviewCommentAction}>
                  <input name="commentId" type="hidden" value={comment.id} />
                  <input name="visibilityState" type="hidden" value={VisibilityState.VISIBLE} />
                  <input name="reason" type="hidden" value="moderator_approved_comment" />
                  <button type="submit">공개</button>
                </form>
                <form action={reviewCommentAction}>
                  <input name="commentId" type="hidden" value={comment.id} />
                  <input name="visibilityState" type="hidden" value={VisibilityState.AUTHOR_ONLY} />
                  <input name="reason" type="hidden" value="moderator_author_only_comment" />
                  <button type="submit">작성자만</button>
                </form>
                <form action={reviewCommentAction}>
                  <input name="commentId" type="hidden" value={comment.id} />
                  <input name="visibilityState" type="hidden" value={VisibilityState.HIDDEN} />
                  <input name="reason" type="hidden" value="moderator_hidden_comment" />
                  <button type="submit">숨김</button>
                </form>
              </div>
            </article>
          ))}
          {heldComments.length === 0 ? <p>검토할 댓글이 없습니다.</p> : null}
        </div>
      </section>
      <section className="moderation-panel">
        <h2>신고</h2>
        <div className="stack-list">
          {reports.map((report) => (
            <article className="review-item" key={report.id}>
              <p>{report.reason}</p>
              <small>{report.targetType} · {report.targetId}</small>
              <div className="action-row">
                <form action={reviewReportAction}>
                  <input name="reportId" type="hidden" value={report.id} />
                  <input name="status" type="hidden" value={ReportStatus.REVIEWED} />
                  <input name="reason" type="hidden" value="moderator_accepted_report" />
                  <button type="submit">처리</button>
                </form>
                <form action={reviewReportAction}>
                  <input name="reportId" type="hidden" value={report.id} />
                  <input name="status" type="hidden" value={ReportStatus.DISMISSED} />
                  <input name="reason" type="hidden" value="moderator_dismissed_report" />
                  <button type="submit">기각</button>
                </form>
              </div>
            </article>
          ))}
          {reports.length === 0 ? <p>열린 신고가 없습니다.</p> : null}
        </div>
      </section>
      <section className="moderation-panel">
        <h2>신뢰 점수 조정</h2>
        <form action={adjustTrustAction} className="settings-form">
          <label>
            사용자 ID
            <input name="userId" />
          </label>
          <label>
            조정값
            <input name="delta" type="number" min="-100" max="100" />
          </label>
          <label>
            사유
            <input name="reason" />
          </label>
          <button type="submit">적용</button>
        </form>
      </section>
      <section className="moderation-panel">
        <h2>랭킹 관리</h2>
        <p>현재 글과 댓글 상태를 기준으로 랭킹 스냅샷을 다시 계산합니다.</p>
        <form action={recomputeRankingsAction}>
          <button type="submit">랭킹 재계산</button>
        </form>
      </section>
      <section className="moderation-panel">
        <h2>오늘 AI 작업 로그</h2>
        <div className="stack-list">
          {aiUsageEvents.map((event) => (
            <article className="review-item" key={event.id}>
              <p>{event.status} · {event.reason}</p>
              <small>
                {event.provider}/{event.model} · 요청 {event.requestedComments}개 · 생성 {event.generatedComments}개
                {event.postId ? ` · 글 ${event.postId}` : ""}
              </small>
            </article>
          ))}
          {aiUsageEvents.length === 0 ? <p>오늘 기록된 AI 작업이 없습니다.</p> : null}
        </div>
      </section>
    </section>
  );
}
