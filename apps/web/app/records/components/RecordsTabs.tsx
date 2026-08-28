export type RecordsTab = "requests" | "replies";

export const RECORDS_TABS: { id: RecordsTab; label: string }[] = [
  { id: "requests", label: "내가 남긴 고민" },
  { id: "replies", label: "내가 남긴 답변" },
];

type RecordsTabsProps = {
  active: RecordsTab;
  onChange(tab: RecordsTab): void;
};

export function RecordsTabs({ active, onChange }: RecordsTabsProps) {
  return (
    <div aria-label="내 기록 종류" className="flex gap-1 border-b border-line" role="tablist">
      {RECORDS_TABS.map((tab) => (
        <button
          aria-selected={active === tab.id}
          className={[
            "-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition",
            active === tab.id
              ? "border-primary text-foreground"
              : "border-transparent text-muted hover:text-foreground",
          ].join(" ")}
          key={tab.id}
          role="tab"
          type="button"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
