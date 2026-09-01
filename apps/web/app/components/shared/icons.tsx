type IconProps = {
  className?: string;
};

export function FlagIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={1.8}
        x1="5"
        x2="5"
        y1="3"
        y2="21"
      />
      <path
        d="M5 4.25h12.2c.95 0 1.4 1.16.7 1.82L14.6 9l3.3 2.93c.7.66.25 1.82-.7 1.82H5V4.25Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ArchiveIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      viewBox="0 0 24 24"
    >
      <rect height="4" rx="1" width="17" x="3.5" y="4" />
      <path
        d="M4.5 8.5V18a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.5 12.5h5" strokeLinecap="round" />
    </svg>
  );
}

export function SkipIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 5v14l7-7-7-7Zm9 0v14l7-7-7-7Z" />
    </svg>
  );
}

export function BookmarkIcon({
  className,
  filled,
}: IconProps & { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      viewBox="0 0 24 24"
    >
      <path
        d="M7 3.5A1.5 1.5 0 0 1 8.5 2h7A1.5 1.5 0 0 1 17 3.5V21l-5-3.6L7 21V3.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
