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

function ControlledSingle(
  props: Omit<
    Extract<React.ComponentProps<typeof HeatmapCalendar>, { mode: "single" }>,
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

function ControlledRange(
  props: Omit<
    Extract<React.ComponentProps<typeof HeatmapCalendar>, { mode: "range" }>,
    "onRangeChange" | "onMonthChange"
  >,
) {
  const [month, setMonth] = useState(props.month);
  const [from, setFrom] = useState(props.from);
  const [to, setTo] = useState(props.to);
  return (
    <HeatmapCalendar
      {...props}
      from={from}
      month={month}
      to={to}
      onMonthChange={setMonth}
      onRangeChange={(nextFrom, nextTo) => {
        setFrom(nextFrom);
        setTo(nextTo);
      }}
    />
  );
}

// /read's usage — one selected day, days after maxDate (today) disabled.
export const SingleSelect: Story = {
  render: () => (
    <ControlledSingle
      counts={SAMPLE_COUNTS}
      maxDate="2026-09-20"
      mode="single"
      month={MONTH}
      selected="2026-09-14"
    />
  ),
};

// /records' usage — click a start day then an end day to select a range.
export const RangeSelect: Story = {
  render: () => (
    <ControlledRange
      counts={SAMPLE_COUNTS}
      from="2026-09-05"
      mode="range"
      month={MONTH}
      to="2026-09-14"
    />
  ),
};

export const NoActivity: Story = {
  render: () => (
    <ControlledSingle
      counts={[]}
      mode="single"
      month={MONTH}
      selected={undefined}
    />
  ),
};
