import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { Pagination } from "./Pagination";

const meta: Meta<typeof Pagination> = {
  title: "shared/Pagination",
  component: Pagination,
};
export default meta;

type Story = StoryObj<typeof Pagination>;

function ControlledPagination(props: React.ComponentProps<typeof Pagination>) {
  const [page, setPage] = useState(props.page);
  return <Pagination {...props} page={page} onPageChange={setPage} />;
}

export const FewPages: Story = {
  render: (args) => <ControlledPagination {...args} page={2} totalPages={4} />,
};

export const ManyPages: Story = {
  render: (args) => <ControlledPagination {...args} page={12} totalPages={40} />,
};

export const SinglePage: Story = {
  render: (args) => <ControlledPagination {...args} page={1} totalPages={1} />,
};
