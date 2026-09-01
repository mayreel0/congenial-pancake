import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  title: "shared/Button",
  component: Button,
  args: {
    children: "저장",
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    type: "button",
  },
};

export const Disabled: Story = {
  args: {
    type: "button",
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    type: "button",
    fullWidth: true,
  },
};

export const Small: Story = {
  args: {
    type: "button",
    size: "sm",
  },
};

export const Secondary: Story = {
  args: {
    type: "button",
    variant: "secondary",
    children: "취소",
  },
};

export const AsLink: Story = {
  args: {
    children: "답변 남기러 가기",
    href: "/answer",
  },
};
