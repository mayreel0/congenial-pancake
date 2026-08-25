import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ActionConfirmDialog } from "ui/ActionConfirmDialog";

const meta: Meta<typeof ActionConfirmDialog> = {
  title: "shared/ActionConfirmDialog",
  component: ActionConfirmDialog,
  args: {
    open: true,
    confirmLabel: "신고하기",
    onCancel: fn(),
    onConfirm: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof ActionConfirmDialog>;

export const Default: Story = {
  args: {
    message: "이 요청을 신고할까요? 신고하면 읽기 목록에서 사라집니다.",
  },
};

export const LongKoreanText: Story = {
  args: {
    message:
      "이 답변을 신고할까요? 신고 사유가 명확하지 않더라도 다른 사용자에게 불편을 줄 수 있는 내용이라면 신고해주세요. 신고하면 이 답변은 더 이상 다른 사람에게 보이지 않습니다.",
  },
};

export const Mobile: Story = {
  args: Default.args,
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
