import type {
  OnseolReply,
  OnseolRequest,
  OnseolViewer,
  PrototypeState,
} from "./types";

const SAMPLE_VIEWER: OnseolViewer = { id: "viewer-local" };

export function createInitialPrototypeState(now: Date): PrototypeState {
  const today = now.toISOString();
  const requestA: OnseolRequest = {
    id: "sample-request-1",
    body: "오늘 작은 실수를 계속 떠올리게 됩니다. 너무 크게 생각하지 않아도 된다고 듣고 싶어요.",
    createdAt: today,
    authorId: "sample-author-1",
    replyIds: ["sample-reply-1"],
    reportCount: 0,
    hidden: false,
  };
  const requestB: OnseolRequest = {
    id: "sample-request-2",
    body: "해야 할 일을 끝냈는데도 이상하게 뿌듯하지 않습니다. 그래도 잘한 걸까요.",
    createdAt: today,
    authorId: "sample-author-2",
    replyIds: ["sample-reply-2"],
    reportCount: 0,
    hidden: false,
  };
  const replies: OnseolReply[] = [
    {
      id: "sample-reply-1",
      requestId: requestA.id,
      body: "계속 떠오른다는 건 신경 썼다는 뜻이기도 합니다. 오늘 하나 배웠다고 봐도 괜찮아요.",
      createdAt: today,
      authorId: "sample-replier-1",
      reportCount: 0,
      hidden: false,
    },
    {
      id: "sample-reply-2",
      requestId: requestB.id,
      body: "기분이 바로 따라오지 않아도 끝낸 일은 사라지지 않습니다. 해낸 건 해낸 거예요.",
      createdAt: today,
      authorId: "sample-replier-2",
      reportCount: 0,
      hidden: false,
    },
  ];

  return {
    viewer: SAMPLE_VIEWER,
    requests: [requestA, requestB],
    replies,
    requestDraft: "",
    replyDrafts: {},
    selectedRequestId: requestA.id,
    skippedRequestIds: [],
    heldRequestIds: [],
    savedRequestIds: [],
  };
}
