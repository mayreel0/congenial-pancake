import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { Toast } from "./Toast";

const meta: Meta<typeof Toast> = {
  title: "shared/Toast",
  component: Toast,
  args: {
    onDismiss: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof Toast>;

export const Success: Story = {
  args: {
    toast: { kind: "success", message: "저장했어요." },
  },
};

export const ErrorKind: Story = {
  name: "Error",
  args: {
    toast: { kind: "error", message: "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요." },
  },
};

export const Warning: Story = {
  args: {
    toast: { kind: "warning", message: "확인이 필요해요." },
  },
};
