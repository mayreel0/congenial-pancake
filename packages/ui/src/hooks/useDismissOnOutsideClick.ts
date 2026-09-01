import { useEffect, useRef, type RefObject } from "react";

// Attach the returned ref to whichever element should be treated as
// "inside" (a dropdown's trigger+panel wrapper, a modal's box) — a
// mousedown outside it calls onDismiss. Only active while `active` is
// true, mirroring the open-state-gated effect every call site already had
// before this was extracted (RequestBubble/ReadRequestBubble/
// ReadReplyBubble/ServiceNav's profile menu, now also ActionConfirmDialog).
export function useDismissOnOutsideClick<T extends HTMLElement>(
  active: boolean,
  onDismiss: () => void,
): RefObject<T | null> {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!active) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onDismiss();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [active, onDismiss]);

  return containerRef;
}
