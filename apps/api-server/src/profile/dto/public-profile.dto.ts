export type PublicProfileDto = {
  nickname: string;
  nicknameDiscriminator: string;
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
