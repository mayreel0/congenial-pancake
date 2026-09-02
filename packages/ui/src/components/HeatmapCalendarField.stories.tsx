import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { HeatmapCalendarField } from "./HeatmapCalendarField";

const meta: Meta<typeof HeatmapCalendarField> = {
  title: "shared/HeatmapCalendarField",
  component: HeatmapCalendarField,
};
export default meta;

type Story = StoryObj<typeof HeatmapCalendarField>;

const MONTH = "2026-09";

const SAMPLE_COUNTS = [
  { date: "2026-09-01", count: 2 },
  { date: "2026-09-02", count: 5 },
  { date: "2026-09-05", count: 9 },
  { date: "2026-09-06", count: 12 },
  { date: "2026-09-14", count: 7 },
];

function Controlled(
  props: Omit<
    React.ComponentProps<typeof HeatmapCalendarField>,
    "onSelect" | "onMonthChange"
  >,
) {
  const [month, setMonth] = useState(props.month);
  const [selected, setSelected] = useState(props.selected);
  return (
    <HeatmapCalendarField
      {...props}
      month={month}
      selected={selected}
      onMonthChange={setMonth}
      onSelect={setSelected}
    />
  );
}

// /read's usage — opens on click, closes as soon as a day is picked.
export const SingleSelect: Story = {
  render: () => (
    <Controlled
      counts={SAMPLE_COUNTS}
      label="날짜"
      maxDate="2026-09-20"
      month={MONTH}
      placeholder="날짜를 선택하세요"
      selected="2026-09-14"
    />
  ),
};

// /records' usage — two of these side by side, cross-constrained via
// minDate/maxDate (시작일's maxDate is 종료일's value and vice versa) so a
// backwards range can't be picked. This story shows the pair together.
export const RangePair: Story = {
  render: () => {
    function RangePairDemo() {
      const [month, setMonth] = useState(MONTH);
      const [from, setFrom] = useState<string | undefined>("2026-09-05");
      const [to, setTo] = useState<string | undefined>("2026-09-14");
      return (
        <div className="flex flex-wrap gap-3">
          <HeatmapCalendarField
            counts={SAMPLE_COUNTS}
            label="시작일"
            maxDate={to}
            month={month}
            placeholder="시작일을 선택하세요"
            selected={from}
            onMonthChange={setMonth}
            onSelect={setFrom}
          />
          <HeatmapCalendarField
            counts={SAMPLE_COUNTS}
            label="종료일"
            minDate={from}
            month={month}
            placeholder="종료일을 선택하세요"
            selected={to}
            onMonthChange={setMonth}
            onSelect={setTo}
          />
        </div>
      );
    }
    return <RangePairDemo />;
  },
};
