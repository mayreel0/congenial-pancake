import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActivitySummary } from "./ActivitySummary";

const meta: Meta<typeof ActivitySummary> = {
  title: "today/ActivitySummary",
  component: ActivitySummary,
};
export default meta;

type Story = StoryObj<typeof ActivitySummary>;

export const Default: Story = {
  args: {
    requestCount: 12,
    replyCount: 34,
    waitingCount: 3,
  },
};

export const Empty: Story = {
  args: {
    requestCount: 0,
    replyCount: 0,
    waitingCount: 0,
  },
};

export const Mobile: Story = {
  args: Default.args,
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
