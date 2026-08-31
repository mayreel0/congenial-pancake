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
  const [pageSize, setPageSize] = useState(props.pageSize);
  return (
    <Pagination
      {...props}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  );
}

export const FewPages: Story = {
  render: (args) => (
    <ControlledPagination {...args} page={2} pageSize={10} totalPages={4} />
  ),
};

export const ManyPages: Story = {
  render: (args) => (
    <ControlledPagination {...args} page={12} pageSize={10} totalPages={40} />
  ),
};

// Still shows the full control (including the page-size selector) even
// though there's nowhere else to page to.
export const SinglePage: Story = {
  render: (args) => (
    <ControlledPagination {...args} page={1} pageSize={10} totalPages={1} />
  ),
};
