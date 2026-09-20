"use client";

import { useEffect } from "react";
import { Button } from "ui/Button";
import { POPOVER_EXIT_MS, useAnimatedPresence } from "ui/useAnimatedPresence";
import { useDismissOnOutsideClick } from "ui/useDismissOnOutsideClick";

type IosInstallGuideProps = {
  open: boolean;
  onClose(): void;
};

// iOS can't open an install prompt from a button — the only route is the
// share sheet — so this just walks through it.
export function IosInstallGuide({ open, onClose }: IosInstallGuideProps) {
  const shouldRender = useAnimatedPresence(open, POPOVER_EXIT_MS);
  const boxRef = useDismissOnOutsideClick<HTMLDivElement>(open, onClose);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!shouldRender) return null;

  return (
    <div
      aria-label="앱으로 설치하는 방법"
      aria-modal="true"
      className={`fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-5 ${
        open ? "onseol-dialog-backdrop-enter" : "onseol-dialog-backdrop-leave"
      }`}
      role="dialog"
    >
      <div
        className={`w-full max-w-sm space-y-4 rounded-lg border border-line bg-surface p-5 shadow-sm ${
          open ? "onseol-dialog-box-enter" : "onseol-dialog-box-leave"
        }`}
        ref={boxRef}
      >
        <p className="text-sm font-semibold text-foreground">
          홈 화면에 추가하면 앱처럼 이용할 수 있어요
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-foreground">
          <li>브라우저의 공유 버튼을 눌러주세요.</li>
          <li>&ldquo;홈 화면에 추가&rdquo;를 선택해주세요.</li>
        </ol>
        <div className="flex justify-end">
          <Button size="sm" onClick={onClose}>
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}
