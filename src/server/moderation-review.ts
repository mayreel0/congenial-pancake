import { ModerationTargetType, ReportStatus, SanctionState } from "@prisma/client";
import { db } from "@/lib/db";

type UserContext = {
  id: string;
  nickname: string;
  trustScore: number;
  sanctionState: SanctionState;
};

type ReporterContext = Omit<UserContext, "id">;

type OpenReportWithReporter = Awaited<ReturnType<typeof fetchOpenReports>>[number];

export type ModerationReportContext = OpenReportWithReporter & {
  targetPreview: string;
  targetAuthor: UserContext | null;
  priorAcceptedCount: number;
  priorDismissedCount: number;
};

const targetSelectAuthor = {
  id: true,
  nickname: true,
  trustScore: true,
  sanctionState: true
} as const;

function previewText(text: string | null | undefined): string {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return "내용을 확인할 수 없습니다.";
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized;
}

async function fetchOpenReports() {
  return db.report.findMany({
    where: { status: ReportStatus.OPEN },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      reporter: {
        select: {
          nickname: true,
          trustScore: true,
          sanctionState: true
        } satisfies Record<keyof ReporterContext, true>
      }
    }
  });
}

function idsFor(reports: OpenReportWithReporter[], targetType: ModerationTargetType) {
  return reports.filter((report) => report.targetType === targetType).map((report) => report.targetId);
}

export async function listOpenReportsForModeration(): Promise<ModerationReportContext[]> {
  const reports = await fetchOpenReports();
  const [posts, comments, replies, users] = await Promise.all([
    db.praisePost.findMany({
      where: { id: { in: idsFor(reports, ModerationTargetType.POST) } },
      select: {
        id: true,
        title: true,
        body: true,
        author: { select: targetSelectAuthor }
      }
    }),
    db.praiseComment.findMany({
      where: { id: { in: idsFor(reports, ModerationTargetType.COMMENT) } },
      select: {
        id: true,
        body: true,
        author: { select: targetSelectAuthor }
      }
    }),
    db.reply.findMany({
      where: { id: { in: idsFor(reports, ModerationTargetType.REPLY) } },
      select: {
        id: true,
        body: true,
        author: { select: targetSelectAuthor }
      }
    }),
    db.user.findMany({
      where: { id: { in: idsFor(reports, ModerationTargetType.USER) } },
      select: targetSelectAuthor
    })
  ]);

  const postById = new Map(posts.map((post) => [post.id, post]));
  const commentById = new Map(comments.map((comment) => [comment.id, comment]));
  const replyById = new Map(replies.map((reply) => [reply.id, reply]));
  const userById = new Map(users.map((user) => [user.id, user]));

  return Promise.all(
    reports.map(async (report) => {
      const [priorAcceptedCount, priorDismissedCount] = await Promise.all([
        db.report.count({
          where: { targetType: report.targetType, targetId: report.targetId, status: ReportStatus.REVIEWED }
        }),
        db.report.count({
          where: { targetType: report.targetType, targetId: report.targetId, status: ReportStatus.DISMISSED }
        })
      ]);

      if (report.targetType === ModerationTargetType.POST) {
        const post = postById.get(report.targetId);
        return {
          ...report,
          targetPreview: post ? previewText(`${post.title} ${post.body}`) : "삭제되었거나 찾을 수 없는 글",
          targetAuthor: post?.author ?? null,
          priorAcceptedCount,
          priorDismissedCount
        };
      }

      if (report.targetType === ModerationTargetType.COMMENT) {
        const comment = commentById.get(report.targetId);
        return {
          ...report,
          targetPreview: comment ? previewText(comment.body) : "삭제되었거나 찾을 수 없는 댓글",
          targetAuthor: comment?.author ?? null,
          priorAcceptedCount,
          priorDismissedCount
        };
      }

      if (report.targetType === ModerationTargetType.REPLY) {
        const reply = replyById.get(report.targetId);
        return {
          ...report,
          targetPreview: reply ? previewText(reply.body) : "삭제되었거나 찾을 수 없는 답글",
          targetAuthor: reply?.author ?? null,
          priorAcceptedCount,
          priorDismissedCount
        };
      }

      const targetUser = userById.get(report.targetId) ?? null;
      return {
        ...report,
        targetPreview: targetUser ? `사용자 ${targetUser.nickname}` : "삭제되었거나 찾을 수 없는 사용자",
        targetAuthor: targetUser,
        priorAcceptedCount,
        priorDismissedCount
      };
    })
  );
}
