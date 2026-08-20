import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LandingHero } from "./LandingHero";

const meta: Meta<typeof LandingHero> = {
  title: "landing/LandingHero",
  component: LandingHero,
};
export default meta;

type Story = StoryObj<typeof LandingHero>;

export const Default: Story = {};

export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
};
