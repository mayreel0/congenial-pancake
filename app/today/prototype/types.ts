export type OnseolRequest = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  replyIds: string[];
  reportCount: number;
  hidden: boolean;
};

export type OnseolReply = {
  id: string;
  requestId: string;
  body: string;
  createdAt: string;
  authorId: string;
  reportCount: number;
  hidden: boolean;
};

export type OnseolViewer = {
  id: string;
};

export type ReplyDrafts = Record<string, string>;

export type PrototypeState = {
  viewer: OnseolViewer;
  requests: OnseolRequest[];
  replies: OnseolReply[];
  requestDraft: string;
  replyDrafts: ReplyDrafts;
  selectedRequestId: string | null;
  skippedRequestIds: string[];
  heldRequestIds: string[];
  savedRequestIds: string[];
};
