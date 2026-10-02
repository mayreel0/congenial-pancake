"use client";

import { useId } from "react";

type SignupConsentProps = {
  checked: boolean;
  onChange(checked: boolean): void;
};

export function SignupConsent({ checked, onChange }: SignupConsentProps) {
  const id = useId();

  return (
    <div className="space-y-2 text-sm">
      <label className="flex cursor-pointer items-start gap-2" htmlFor={id}>
        <input
          checked={checked}
          className="mt-1 size-4 shrink-0 accent-primary"
          id={id}
          required
          type="checkbox"
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span>만 14세 이상이며 이용약관·개인정보처리방침에 동의합니다 (필수)</span>
      </label>
      <div className="flex flex-wrap gap-x-4 gap-y-2 pl-6 text-primary">
        <a className="underline underline-offset-2" href="/terms" rel="noopener noreferrer" target="_blank">
          이용약관 (새 탭)
        </a>
        <a className="underline underline-offset-2" href="/privacy" rel="noopener noreferrer" target="_blank">
          개인정보처리방침 (새 탭)
        </a>
      </div>
    </div>
  );
}
