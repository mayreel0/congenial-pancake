import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { PopoverDialog } from "./PopoverDialog";

const meta: Meta<typeof PopoverDialog> = {
  title: "shared/PopoverDialog",
  component: PopoverDialog,
  args: {
    open: true,
    label: "예시",
    popoverClassName: "p-4 sm:absolute sm:left-0 sm:top-2 sm:w-64",
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-64">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PopoverDialog>;

// Narrow the viewport below 640px to see the centered-dialog form.
export const Default: Story = {
  args: {
    children: <p className="text-sm text-foreground">내용이 들어갑니다.</p>,
  },
};
