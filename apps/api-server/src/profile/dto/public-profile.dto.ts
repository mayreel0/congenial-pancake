export type PublicProfileDto = {
  nickname: string;
  nicknameDiscriminator: string;
  // Each independently toggleable (users.show*OnProfile) — a hidden list
  // is an empty array, not an error; requestCount/replyCount are non-null
  // only when the count switch is on, regardless of whether the
  // corresponding list itself is shown.
  requestsVisible: boolean;
  repliesVisible: boolean;
  countsVisible: boolean;
  requestCount: number | null;
  replyCount: number | null;
  requests: {
    id: string;
    body: string;
    createdAt: Date;
  }[];
  replies: {
    id: string;
    body: string;
    createdAt: Date;
    requestId: string;
    requestBody: string;
  }[];
};
