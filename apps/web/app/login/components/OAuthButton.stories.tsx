import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OAuthButton } from "./OAuthButton";

const meta: Meta<typeof OAuthButton> = {
  title: "login/OAuthButton",
  component: OAuthButton,
  args: {
    href: "#",
  },
};
export default meta;

type Story = StoryObj<typeof OAuthButton>;

export const Google: Story = {
  args: { provider: "google" },
};

export const Kakao: Story = {
  args: { provider: "kakao" },
};

export const Naver: Story = {
  args: { provider: "naver" },
};

export const AllThree: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 320 }}>
      <OAuthButton {...args} provider="google" />
      <OAuthButton {...args} provider="kakao" />
      <OAuthButton {...args} provider="naver" />
    </div>
  ),
};
