import { BookmarkIcon } from "./icons";

type SaveToggleButtonProps = {
  saved: boolean;
  onToggle(): void;
};

export function SaveToggleButton({ saved, onToggle }: SaveToggleButtonProps) {
  return (
    <button
      aria-label={saved ? "마음에 남긴 온설, 눌러서 지우기" : "마음에 남기기"}
      aria-pressed={saved}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-surface-muted hover:text-foreground"
      type="button"
      onClick={onToggle}
    >
      <BookmarkIcon className="h-4 w-4" filled={saved} />
      마음에 남기기
    </button>
  );
}
