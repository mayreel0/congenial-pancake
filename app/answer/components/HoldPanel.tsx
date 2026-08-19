import { truncatePreview } from "../../today/prototype/model";
import type { OnseolRequest } from "../../today/prototype/types";

type HoldPanelProps = {
  open: boolean;
  heldRequests: OnseolRequest[];
  onSelect(requestId: string): void;
  onClose(): void;
};

export function HoldPanel({
  open,
  heldRequests,
  onSelect,
  onClose,
}: HoldPanelProps) {
  if (!open) return null;

  return (
    <div
      aria-label="보류한 온설 목록"
      className="absolute inset-x-0 bottom-full z-10 max-h-72 overflow-y-auto border-t border-line bg-surface px-5 py-3 shadow-sm sm:px-8"
      role="dialog"
    >
      <div className="mx-auto w-full max-w-6xl">
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
        {heldRequests.length === 0 ? (
          <p className="py-4 text-sm text-muted">보류한 온설이 없어요.</p>
        ) : (
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
        )}
      </div>
    </div>
  );
}
