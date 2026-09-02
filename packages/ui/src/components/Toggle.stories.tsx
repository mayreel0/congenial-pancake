import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Toggle } from "./Toggle";

const meta: Meta<typeof Toggle> = {
  title: "shared/Toggle",
  component: Toggle,
  args: {
    label: "닉네임(민들레)으로 남기기",
  },
};
export default meta;

type Story = StoryObj<typeof Toggle>;

function ControlledToggle(props: React.ComponentProps<typeof Toggle>) {
  const [checked, setChecked] = useState(props.checked);
  return <Toggle {...props} checked={checked} onChange={setChecked} />;
}

export const Off: Story = {
  render: (args) => <ControlledToggle {...args} checked={false} />,
};

export const On: Story = {
  render: (args) => <ControlledToggle {...args} checked={true} />,
};

export const Disabled: Story = {
  render: (args) => <ControlledToggle {...args} checked={false} disabled />,
};
