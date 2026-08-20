export type ActivityStat = {
  label: string;
  value: string;
  helper: string;
};

export type SampleExchange = {
  request: string;
  reply: string;
  timestamp: string;
};

export const activityStats: ActivityStat[] = [
  {
    label: "오늘의 위로 요청",
    value: "18",
    helper: "짧게 남긴 이야기",
  },
  {
    label: "오늘의 답장",
    value: "42",
    helper: "담백하게 건넨 말",
  },
  {
    label: "답변을 기다리는 글",
    value: "6",
    helper: "먼저 보여줄 이야기",
  },
];

export const sampleExchange: SampleExchange = {
  request: "오늘 발표에서 말을 조금 더듬었습니다. 괜찮았다고 듣고 싶어요.",
  reply: "더듬은 것보다 끝까지 말한 게 더 오래 남습니다. 오늘 할 일은 해낸 거예요.",
  timestamp: "방금 전",
};
