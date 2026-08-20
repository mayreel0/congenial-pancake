import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { NoteCard } from "./NoteCard";
import type { OnseolRequest } from "../prototype/types";

function makeRequest(overrides: Partial<OnseolRequest> = {}): OnseolRequest {
  return {
    id: "req-1",
    body: "오늘 작은 실수를 계속 떠올리게 됩니다. 너무 크게 생각하지 않아도 된다고 듣고 싶어요.",
    createdAt: "2026-08-20T04:36:00.000Z",
    authorId: "user-1",
    replyIds: [],
    reportCount: 0,
    hidden: false,
    ...overrides,
  };
}

const meta: Meta<typeof NoteCard> = {
  title: "today/NoteCard",
  component: NoteCard,
  args: {
    onSelect: fn(),
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

type Story = StoryObj<typeof NoteCard>;

export const Default: Story = {
  args: {
    request: makeRequest(),
    replyCount: 0,
    active: false,
    mine: false,
  },
};

export const Active: Story = {
  args: {
    ...Default.args,
    active: true,
  },
};

export const Mine: Story = {
  args: {
    ...Default.args,
    mine: true,
    replyCount: 2,
  },
};

export const LongKoreanText: Story = {
  args: {
    ...Default.args,
    request: makeRequest({
      body: "오늘 하루 종일 크고 작은 일들이 계속 겹쳐서 정신이 하나도 없었는데, 막상 끝나고 나니 뭘 했는지도 잘 기억이 안 나고 그냥 지쳐만 있는 것 같습니다. 별거 아닌데도 자꾸 마음이 복잡해지네요.",
    }),
    replyCount: 5,
  },
};

export const Mobile: Story = {
  args: Default.args,
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
