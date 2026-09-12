import { truncatePreview } from "../../lib/format";
import type { RequestDto } from "../../lib/requests/api";
import { Skeleton } from "ui/Skeleton";
import { POPOVER_EXIT_MS, useAnimatedPresence } from "ui/useAnimatedPresence";

type HoldPanelBodyProps = {
  loading: boolean;
  heldRequests: RequestDto[];
  onSelect(requestId: string): void;
};

function HoldPanelBody({ loading, heldRequests, onSelect }: HoldPanelBodyProps) {
  if (loading) {
    return (
      <div className="space-y-2 py-1">
        {[0, 1].map((key) => (
          <Skeleton className="h-9 w-full" key={key} />
        ))}
      </div>
    );
  }

  if (heldRequests.length === 0) {
    return <p className="py-4 text-sm text-muted">보류한 온설이 없어요.</p>;
  }

  return (
    <ul className="space-y-2">
      {heldRequests.map((request) => (
        <li key={request.id}>
          <button
            className="block w-full rounded-lg border border-line bg-background px-3 py-2 text-left text-sm text-foreground transition hover:bg-surface-muted"
            type="button"
            onClick={() => onSelect(request.id)}
          >
            {truncatePreview(request.body, 60)}
          </button>
        </li>
      ))}
    </ul>
  );
}

type HoldPanelProps = {
  open: boolean;
  heldRequests: RequestDto[];
  loading: boolean;
  onSelect(requestId: string): void;
  onClose(): void;
};

export function HoldPanel({
  open,
  heldRequests,
  loading,
  onSelect,
  onClose,
}: HoldPanelProps) {
  const shouldRender = useAnimatedPresence(open, POPOVER_EXIT_MS);
  if (!shouldRender) return null;

  return (
    <div
      aria-label="보류한 온설 목록"
      className={`absolute right-0 top-full z-10 mt-2 max-h-72 w-72 overflow-y-auto rounded-lg border border-line bg-surface px-4 py-3 shadow-sm ${
        open ? "onseol-popover-enter" : "onseol-popover-leave"
      }`}
      role="dialog"
    >
      <div className="flex items-center justify-between pb-2">
        <p className="text-sm font-semibold text-foreground">보류 중</p>
        <button
          aria-label="보류함 닫기"
          className="text-sm text-muted"
          type="button"
          onClick={onClose}
        >
          닫기
        </button>
      </div>
      <HoldPanelBody
        heldRequests={heldRequests}
        loading={loading}
        onSelect={onSelect}
      />
    </div>
  );
}
