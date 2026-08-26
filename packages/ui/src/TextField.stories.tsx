import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TextField } from "./TextField";

const meta: Meta<typeof TextField> = {
  title: "shared/TextField",
  component: TextField,
  args: {
    label: "이메일",
    id: "email",
    type: "email",
  },
};
export default meta;

type Story = StoryObj<typeof TextField>;

export const Default: Story = {};

export const WithHint: Story = {
  args: {
    label: "답변 큐 신선도 (시간)",
    id: "queueFreshnessHours",
    type: "number",
    hint: "이 시간이 지난 온설은 답변 큐/보관함에서 제외됩니다.",
    width: "compact",
    defaultValue: 60,
  },
};

export const Required: Story = {
  args: {
    required: true,
  },
};
