import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { HeatmapCalendar } from "./HeatmapCalendar";

const meta: Meta<typeof HeatmapCalendar> = {
  title: "shared/HeatmapCalendar",
  component: HeatmapCalendar,
};
export default meta;

type Story = StoryObj<typeof HeatmapCalendar>;

const MONTH = "2026-09";

// A spread of counts across the month so all four intensity tiers show up,
// plus several zero-count days rendered uncolored.
const SAMPLE_COUNTS = [
  { date: "2026-09-01", count: 2 },
  { date: "2026-09-02", count: 5 },
  { date: "2026-09-05", count: 9 },
  { date: "2026-09-06", count: 12 },
  { date: "2026-09-10", count: 3 },
  { date: "2026-09-14", count: 7 },
  { date: "2026-09-20", count: 1 },
];

function Controlled(
  props: Omit<
    React.ComponentProps<typeof HeatmapCalendar>,
    "onSelect" | "onMonthChange"
  >,
) {
  const [month, setMonth] = useState(props.month);
  const [selected, setSelected] = useState(props.selected);
  return (
    <HeatmapCalendar
      {...props}
      month={month}
      selected={selected}
      onMonthChange={setMonth}
      onSelect={setSelected}
    />
  );
}

// /read's usage — one selected day, days after maxDate (today) disabled.
export const SingleSelect: Story = {
  render: () => (
    <Controlled
      counts={SAMPLE_COUNTS}
      maxDate="2026-09-20"
      month={MONTH}
      selected="2026-09-14"
    />
  ),
};

// /records' 시작일/종료일 pair — each field constrains the other via
// minDate/maxDate so a range can't be picked backwards. This story shows
// just the 종료일 side (minDate set to a chosen 시작일).
export const RangeEndWithMinDate: Story = {
  render: () => (
    <Controlled
      counts={SAMPLE_COUNTS}
      minDate="2026-09-05"
      month={MONTH}
      selected={undefined}
    />
  ),
};

export const NoActivity: Story = {
  render: () => (
    <Controlled counts={[]} month={MONTH} selected={undefined} />
  ),
};
