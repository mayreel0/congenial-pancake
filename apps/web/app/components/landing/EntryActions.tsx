import Link from "next/link";
import { InstallAppButton } from "./InstallAppButton";

export function EntryActions() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link
        className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 whitespace-nowrap"
        href="/today"
      >
        웹에서 시작하기
      </Link>
      <InstallAppButton />
    </div>
  );
}
