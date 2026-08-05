import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hideMyComfortReply, hideMyComfortRequest } from "@/app/me/actions";
import { isWriteRestricted, sanctionStateLabel } from "@/server/permissions";
import { VisibilityState, type Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const activityPageSize = 10;
type ActivitySort = "latest" | "oldest";

function normalizePageParam(value: string | string[] | undefined): number {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeSortParam(value: string | string[] | undefined): ActivitySort {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "oldest" ? "oldest" : "latest";
}

function sortToOrder(sort: ActivitySort): Prisma.SortOrder {
  return sort === "oldest" ? "asc" : "desc";
}

function activityHref(params: { requestsPage: number; repliesPage: number; sort: ActivitySort }) {
  return `/me?requestsPage=${params.requestsPage}&repliesPage=${params.repliesPage}&sort=${params.sort}`;
}

export default async function MyActivityPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <section className="page-section">
        <h1>로그인이 필요합니다</h1>
        <p>내 활동은 인증된 계정만 볼 수 있습니다.</p>
        <Link href="/login">로그인</Link>
      </section>
    );
  }

  const params = await searchParams;
  const requestsPage = normalizePageParam(params.requestsPage);
  const repliesPage = normalizePageParam(params.repliesPage);
  const sort = normalizeSortParam(params.sort);
  const order = sortToOrder(sort);

  const [user, totalRequests, totalReplies] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      include: {
        comfortRequests: {
          orderBy: { createdAt: order },
          skip: (requestsPage - 1) * activityPageSize,
          take: activityPageSize,
          include: { _count: { select: { replies: { where: { status: VisibilityState.VISIBLE } } } } }
        },
        comfortReplies: {
          orderBy: { createdAt: order },
          skip: (repliesPage - 1) * activityPageSize,
          take: activityPageSize,
          include: { request: { select: { id: true, body: true } } }
        }
      }
    }),
    db.comfortRequest.count({ where: { authorUserId: session.user.id } }),
    db.comfortReply.count({ where: { authorUserId: session.user.id } })
  ]);
  const totalRequestPages = Math.max(1, Math.ceil(totalRequests / activityPageSize));
  const totalReplyPages = Math.max(1, Math.ceil(totalReplies / activityPageSize));
  const writeRestricted = isWriteRestricted(user.sanctionState);

  return (
    <section className="page-section">
      <h1>내 활동</h1>
      <section className="account-state" aria-label="계정 상태">
        <p>계정 상태: {sanctionStateLabel(user.sanctionState)}</p>
        <p>신뢰 점수 {user.trustScore}</p>
        {writeRestricted ? (
          <p role="alert">
            현재 계정은 위로 요청, 답변, 신고 작성이 제한됩니다. 공개된 위로 요청과 활동 기록은 계속 볼 수 있습니다.
          </p>
        ) : null}
      </section>
      <div className="filter-row" aria-label="내 활동 정렬">
        <Link aria-current={sort === "latest" ? "page" : undefined} href={activityHref({ requestsPage: 1, repliesPage: 1, sort: "latest" })}>
          최신순
        </Link>
        <Link aria-current={sort === "oldest" ? "page" : undefined} href={activityHref({ requestsPage: 1, repliesPage: 1, sort: "oldest" })}>
          오래된순
        </Link>
      </div>

      <h2>내가 쓴 위로 요청</h2>
      <div className="stack-list">
        {user.comfortRequests.length > 0 ? (
          user.comfortRequests.map((request) => (
            <article key={request.id} className="feed-item">
              <p>{request.body}</p>
              <small>
                {request.status} · 답변 {request._count.replies}개 · {request.createdAt.toLocaleString("ko-KR")}
              </small>
              {request.status === VisibilityState.VISIBLE ? (
                <form action={hideMyComfortRequest}>
                  <input name="requestId" type="hidden" value={request.id} />
                  <button type="submit">숨기기</button>
                </form>
              ) : null}
            </article>
          ))
        ) : (
          <p>아직 올린 글이 없습니다.</p>
        )}
      </div>
      <nav aria-label="내가 쓴 위로 요청 페이지" className="pagination-row">
        <Link aria-disabled={requestsPage <= 1} href={activityHref({ requestsPage: Math.max(1, requestsPage - 1), repliesPage, sort })}>
          이전
        </Link>
        <span>
          {requestsPage} / {totalRequestPages}
        </span>
        <Link
          aria-disabled={requestsPage >= totalRequestPages}
          href={activityHref({ requestsPage: Math.min(totalRequestPages, requestsPage + 1), repliesPage, sort })}
        >
          다음
        </Link>
      </nav>

      <h2>내가 남긴 답변</h2>
      <div className="stack-list">
        {user.comfortReplies.length > 0 ? (
          user.comfortReplies.map((reply) => (
            <article key={reply.id} className="feed-item">
              <p>{reply.body}</p>
              <small>
                요청: {reply.request.body} · {reply.status} · {reply.createdAt.toLocaleString("ko-KR")}
              </small>
              {reply.status === VisibilityState.VISIBLE ? (
                <form action={hideMyComfortReply}>
                  <input name="replyId" type="hidden" value={reply.id} />
                  <button type="submit">숨기기</button>
                </form>
              ) : null}
            </article>
          ))
        ) : (
          <p>아직 남긴 답변이 없습니다.</p>
        )}
      </div>
      <nav aria-label="내가 남긴 답변 페이지" className="pagination-row">
        <Link aria-disabled={repliesPage <= 1} href={activityHref({ requestsPage, repliesPage: Math.max(1, repliesPage - 1), sort })}>
          이전
        </Link>
        <span>
          {repliesPage} / {totalReplyPages}
        </span>
        <Link
          aria-disabled={repliesPage >= totalReplyPages}
          href={activityHref({ requestsPage, repliesPage: Math.min(totalReplyPages, repliesPage + 1), sort })}
        >
          다음
        </Link>
      </nav>
    </section>
  );
}
