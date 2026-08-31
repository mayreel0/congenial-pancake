import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { MoreMenu } from "./MoreMenu";

function FlagIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={1.8}
        x1="5"
        x2="5"
        y1="3"
        y2="21"
      />
      <path
        d="M5 4.25h12.2c.95 0 1.4 1.16.7 1.82L14.6 9l3.3 2.93c.7.66.25 1.82-.7 1.82H5V4.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

const meta: Meta<typeof MoreMenu> = {
  title: "shared/MoreMenu",
  component: MoreMenu,
  args: {
    ariaLabel: "온설 도구",
    items: [{ key: "report", icon: <FlagIcon />, label: "신고하기", onClick: fn() }],
  },
};
export default meta;

type Story = StoryObj<typeof MoreMenu>;

export const Default: Story = {};

export const MultipleItems: Story = {
  args: {
    items: [
      { key: "hold", icon: <FlagIcon />, label: "보류하기", onClick: fn() },
      { key: "report", icon: <FlagIcon />, label: "신고하기", onClick: fn() },
    ],
  },
};
