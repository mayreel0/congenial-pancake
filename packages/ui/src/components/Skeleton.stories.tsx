import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "shared/Skeleton",
  component: Skeleton,
};
export default meta;

type Story = StoryObj<typeof Skeleton>;

export const TextLine: Story = {
  args: { className: "h-4 w-48" },
};

export const CardShape: Story = {
  render: () => (
    <div className="w-80 space-y-3 rounded-lg border border-line bg-surface px-4 py-5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
};
