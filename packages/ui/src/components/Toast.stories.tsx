import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { Toast } from "./Toast";

const meta: Meta<typeof Toast> = {
  title: "shared/Toast",
  component: Toast,
  args: {
    onDismiss: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof Toast>;

export const Success: Story = {
  args: {
    toast: { kind: "success", message: "저장했어요." },
  },
};

export const ErrorKind: Story = {
  name: "Error",
  args: {
    toast: { kind: "error", message: "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요." },
  },
};

export const Warning: Story = {
  args: {
    toast: { kind: "warning", message: "확인이 필요해요." },
  },
};

export const MobileSwipe: Story = {
  args: {
    toast: { kind: "success", message: "온설을 남겼어요" },
  },
  render: function SwipeExample(args) {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button className="min-h-11 rounded-lg border px-4" onClick={() => setOpen(true)}>
          토스트 다시 보기
        </button>
        <p className="mt-4">모바일 화면에서 알림 본문을 좌우로 밀거나 닫기 버튼을 눌러보세요. 이 예제는 직접 닫을 때까지 유지됩니다.</p>
        <Toast {...args} toast={open ? args.toast : null} onDismiss={() => {
          args.onDismiss();
          setOpen(false);
        }} />
      </>
    );
  },
};

export const LongMessage: Story = {
  ...MobileSwipe,
  args: {
    toast: {
      kind: "warning",
      message: "긴 알림도 화면 안에서 읽을 수 있어야 합니다. ".repeat(30),
    },
  },
};

export const DarkOnInput: Story = {
  ...MobileSwipe,
  globals: { theme: "dark" },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background p-4 text-foreground">
        <label className="mb-6 block">
          오늘 어떤 말을 듣고 싶나요?
          <textarea
            className="mt-2 block w-full rounded-lg border border-line bg-surface p-4"
            placeholder="온설을 남겨보세요"
          />
        </label>
        <Story />
      </div>
    ),
  ],
};

export const LightOnInput: Story = {
  ...DarkOnInput,
  globals: { theme: "light" },
};
