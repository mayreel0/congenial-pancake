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

function ControlledSingle(
  props: Omit<
    Extract<
      React.ComponentProps<typeof HeatmapCalendarField>,
      { mode: "single" }
    >,
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

function ControlledRange(
  props: Omit<
    Extract<
      React.ComponentProps<typeof HeatmapCalendarField>,
      { mode: "range" }
    >,
    "onRangeChange" | "onMonthChange"
  >,
) {
  const [month, setMonth] = useState(props.month);
  const [from, setFrom] = useState(props.from);
  const [to, setTo] = useState(props.to);
  return (
    <HeatmapCalendarField
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

// /read's usage — a compact field that opens the calendar on click and
// closes it again as soon as a day is picked.
export const SingleSelect: Story = {
  render: () => (
    <ControlledSingle
      counts={SAMPLE_COUNTS}
      label="날짜"
      maxDate="2026-09-20"
      mode="single"
      month={MONTH}
      placeholder="날짜를 선택하세요"
      selected="2026-09-14"
    />
  ),
};

// /records' usage — click a start day then an end day; the popover stays
// open until both ends are set.
export const RangeSelect: Story = {
  render: () => (
    <ControlledRange
      counts={SAMPLE_COUNTS}
      from={undefined}
      label="기간"
      mode="range"
      month={MONTH}
      placeholder="기간을 선택하세요"
      to={undefined}
    />
  ),
};
