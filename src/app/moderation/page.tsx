import { ModerationTargetType, ReportStatus, VisibilityState } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getAiControlSetting,
  getTodayAiUsage,
  listTodayAiUsageEvents,
  updateAiControlSetting
} from "@/server/ai-controls";
import { applyTrustDelta, reviewComfortContentVisibility, reviewReport } from "@/server/moderation";
import { listOpenReportsForModeration } from "@/server/moderation-review";
import { getModerationDashboardSummary } from "@/server/moderation-summary";
import { revalidatePath } from "next/cache";

type ReviewableReportStatus = Extract<ReportStatus, "REVIEWED" | "DISMISSED">;
type ComfortModerationTargetType = Extract<ModerationTargetType, "COMFORT_REQUEST" | "COMFORT_REPLY">;

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

function formatWorkerLastSeen(lastSeenAt: Date | null) {
  if (!lastSeenAt) return "최근 활동 없음";
  return `최근 활동 ${new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Seoul"
  }).format(lastSeenAt)}`;
}

function parseComfortTargetType(value: string): ComfortModerationTargetType {
  if (value === ModerationTargetType.COMFORT_REQUEST || value === ModerationTargetType.COMFORT_REPLY) {
    return value;
  }
  throw new Error("MODERATION_ACTION_INVALID");
}

async function reviewComfortContentAction(formData: FormData) {
  "use server";

  const moderatorId = await requireModeratorUserId();
  await reviewComfortContentVisibility({
    moderatorId,
    targetType: parseComfortTargetType(formString(formData, "targetType")),
    targetId: formString(formData, "targetId"),
    status: parseVisibilityState(formString(formData, "status")),
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

export default async function ModerationPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return <section className="page-section"><h1>로그인이 필요합니다</h1></section>;
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.isModerator) {
    return <section className="page-section"><h1>운영자만 접근할 수 있습니다</h1></section>;
  }

  const pendingStatuses = [VisibilityState.HELD, VisibilityState.AUTHOR_ONLY, VisibilityState.HIDDEN];
  const [summary, heldRequests, heldReplies, reports, aiSetting, aiUsage, aiUsageEvents] = await Promise.all([
    getModerationDashboardSummary(),
    db.comfortRequest.findMany({
      where: { status: { in: pendingStatuses } },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    db.comfortReply.findMany({
      where: { status: { in: pendingStatuses } },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    listOpenReportsForModeration(),
    getAiControlSetting(),
    getTodayAiUsage(),
    listTodayAiUsageEvents()
  ]);

  return (
    <section className="page-section">
      <h1>운영 검토</h1>
      <section className="moderation-panel" aria-labelledby="moderation-summary-heading">
        <div>
          <h2 id="moderation-summary-heading">오늘 처리 요약</h2>
          <p>지금 확인할 항목만 모았습니다.</p>
        </div>
        <div className="stack-list">
          <article className="review-item">
            <strong>보류 요청 {summary.pendingRequestCount}개</strong>
            <small>검토 대기</small>
          </article>
          <article className="review-item">
            <strong>보류 답변 {summary.pendingReplyCount}개</strong>
            <small>검토 대기</small>
          </article>
          <article className="review-item">
            <strong>열린 신고 {summary.openReportCount}건</strong>
            <small>처리 필요</small>
          </article>
          <article className="review-item">
            <strong>AI 실패 {summary.todayAiFailureCount}건</strong>
            <small>오늘 기준</small>
          </article>
          <article className="review-item">
            <strong>Worker {summary.workerHealth.label}</strong>
            <small>
              {summary.workerHealth.detail} · {formatWorkerLastSeen(summary.workerHealth.lastSeenAt)} · 설정 경고{" "}
              {summary.workerHealth.configWarningCount}개
            </small>
          </article>
        </div>
      </section>
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
        <h2>보류된 위로 요청</h2>
        <div className="stack-list">
          {heldRequests.map((request) => (
            <article className="review-item" key={request.id}>
              <p>{request.body}</p>
              <small>{request.status} · quality {request.qualityScore} · {request.qualityLabel}</small>
              <div className="action-row">
                <form action={reviewComfortContentAction}>
                  <input name="targetType" type="hidden" value={ModerationTargetType.COMFORT_REQUEST} />
                  <input name="targetId" type="hidden" value={request.id} />
                  <input name="status" type="hidden" value={VisibilityState.VISIBLE} />
                  <input name="reason" type="hidden" value="moderator_approved_comfort_request" />
                  <button type="submit">공개</button>
                </form>
                <form action={reviewComfortContentAction}>
                  <input name="targetType" type="hidden" value={ModerationTargetType.COMFORT_REQUEST} />
                  <input name="targetId" type="hidden" value={request.id} />
                  <input name="status" type="hidden" value={VisibilityState.AUTHOR_ONLY} />
                  <input name="reason" type="hidden" value="moderator_author_only_comfort_request" />
                  <button type="submit">작성자만</button>
                </form>
                <form action={reviewComfortContentAction}>
                  <input name="targetType" type="hidden" value={ModerationTargetType.COMFORT_REQUEST} />
                  <input name="targetId" type="hidden" value={request.id} />
                  <input name="status" type="hidden" value={VisibilityState.HIDDEN} />
                  <input name="reason" type="hidden" value="moderator_hidden_comfort_request" />
                  <button type="submit">숨김</button>
                </form>
              </div>
            </article>
          ))}
          {heldRequests.length === 0 ? <p>검토할 위로 요청이 없습니다.</p> : null}
        </div>
      </section>
      <section className="moderation-panel">
        <h2>보류된 답변</h2>
        <div className="stack-list">
          {heldReplies.map((reply) => (
            <article className="review-item" key={reply.id}>
              <p>{reply.body}</p>
              <small>{reply.status} · quality {reply.qualityScore} · {reply.qualityLabel}</small>
              <div className="action-row">
                <form action={reviewComfortContentAction}>
                  <input name="targetType" type="hidden" value={ModerationTargetType.COMFORT_REPLY} />
                  <input name="targetId" type="hidden" value={reply.id} />
                  <input name="status" type="hidden" value={VisibilityState.VISIBLE} />
                  <input name="reason" type="hidden" value="moderator_approved_comfort_reply" />
                  <button type="submit">공개</button>
                </form>
                <form action={reviewComfortContentAction}>
                  <input name="targetType" type="hidden" value={ModerationTargetType.COMFORT_REPLY} />
                  <input name="targetId" type="hidden" value={reply.id} />
                  <input name="status" type="hidden" value={VisibilityState.AUTHOR_ONLY} />
                  <input name="reason" type="hidden" value="moderator_author_only_comfort_reply" />
                  <button type="submit">작성자만</button>
                </form>
                <form action={reviewComfortContentAction}>
                  <input name="targetType" type="hidden" value={ModerationTargetType.COMFORT_REPLY} />
                  <input name="targetId" type="hidden" value={reply.id} />
                  <input name="status" type="hidden" value={VisibilityState.HIDDEN} />
                  <input name="reason" type="hidden" value="moderator_hidden_comfort_reply" />
                  <button type="submit">숨김</button>
                </form>
              </div>
            </article>
          ))}
          {heldReplies.length === 0 ? <p>검토할 답변이 없습니다.</p> : null}
        </div>
      </section>
      <section className="moderation-panel">
        <h2>신고</h2>
        <div className="stack-list">
          {reports.map((report) => (
            <article className="review-item" key={report.id}>
              <p>{report.reason}</p>
              <small>
                신고자 {report.reporter.nickname} · 신뢰 {report.reporter.trustScore} ·{" "}
                {report.reporter.sanctionState}
              </small>
              <p>대상: {report.targetPreview}</p>
              <small>
                {report.targetType} · {report.targetId}
                {report.targetAuthor
                  ? ` · 대상 작성자 ${report.targetAuthor.nickname} · 신뢰 ${report.targetAuthor.trustScore} · ${report.targetAuthor.sanctionState}`
                  : " · 대상 작성자 없음"}
              </small>
              <small>
                이전 처리 {report.priorAcceptedCount}건 · 기각 {report.priorDismissedCount}건
              </small>
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
