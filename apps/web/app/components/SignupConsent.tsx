"use client";

import { useId } from "react";

type SignupConsentProps = {
  checked: boolean;
  onChange(checked: boolean): void;
};

export function SignupConsent({ checked, onChange }: SignupConsentProps) {
  const id = useId();

  return (
    <div className="flex items-start gap-2 text-sm leading-6">
      <input
        aria-labelledby={`${id}-label`}
        checked={checked}
        className="mt-1 size-4 shrink-0 accent-primary"
        id={id}
        required
        type="checkbox"
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <p id={`${id}-label`}>
        <label className="cursor-pointer" htmlFor={id}>만 14세 이상이며 </label>
        <a className="underline decoration-line underline-offset-4 hover:decoration-current" href="/terms" rel="noopener noreferrer" target="_blank">
          이용약관<span className="sr-only"> (새 탭)</span>
        </a>
        ·<a className="underline decoration-line underline-offset-4 hover:decoration-current" href="/privacy" rel="noopener noreferrer" target="_blank">
          개인정보처리방침<span className="sr-only"> (새 탭)</span>
        </a>
        <label className="cursor-pointer" htmlFor={id}>에 동의합니다 <span className="text-muted">(필수)</span></label>
      </p>
    </div>
  );
}
