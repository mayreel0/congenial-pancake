import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ReplyCard } from "./ReplyCard";
import type { OnseolReply } from "../prototype/types";

function makeReply(overrides: Partial<OnseolReply> = {}): OnseolReply {
  return {
    id: "reply-1",
    requestId: "req-1",
    body: "그 마음이 오래 남을 수 있죠. 그래도 오늘 버틴 건 분명해요.",
    createdAt: "2026-08-20T04:36:00.000Z",
    authorId: "user-2",
    reportCount: 0,
    hidden: false,
    ...overrides,
  };
}

const meta: Meta<typeof ReplyCard> = {
  title: "today/ReplyCard",
  component: ReplyCard,
  args: {
    onReport: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ReplyCard>;

export const Default: Story = {
  args: {
    reply: makeReply(),
    mine: false,
  },
};

export const Mine: Story = {
  args: {
    reply: makeReply(),
    mine: true,
  },
};

export const LongKoreanText: Story = {
  args: {
    reply: makeReply({
      body: "저도 비슷한 시기가 있었는데, 그때는 몰랐지만 지나고 보니 그냥 버티는 것만으로도 충분했던 것 같아요. 지금 느끼는 감정이 이상한 게 아니니까 너무 자책하지 않으셨으면 좋겠습니다.",
    }),
    mine: false,
  },
};

export const Mobile: Story = {
  args: Default.args,
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
