type IconProps = {
  className?: string;
};

export function MoreIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

// Toast icons — circle takes its color from the parent's text-color class
// (currentColor), glyph is always white so it reads against any of the
// three toast colors without needing its own theme handling.
export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="currentColor" r="10" />
      <path
        d="M7.5 12.5l3 3 6-6.5"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

export function XCircleIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="currentColor" r="10" />
      <path
        d="M8.5 8.5l7 7M15.5 8.5l-7 7"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeWidth={2}
      />
    </svg>
  );
}

// Pending-button spinner — a light full ring plus one solid arc, spun via
// the consumer's own `animate-spin` class (this component is just the
// static shape) so `prefers-reduced-motion` can be handled in one place
// (globals.css) rather than baked into the icon itself.
export function SpinnerIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" opacity="0.25" r="9" stroke="currentColor" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

export function WarningCircleIcon({ className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="currentColor" r="10" />
      <path d="M12 7v6" stroke="white" strokeLinecap="round" strokeWidth={2} />
      <circle cx="12" cy="16.3" fill="white" r="1.15" />
    </svg>
  );
}
