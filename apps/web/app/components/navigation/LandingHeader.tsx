"use client";

import Link from "next/link";
import { useState } from "react";
import { useDismissOnOutsideClick } from "ui/useDismissOnOutsideClick";
import { useAuth } from "../../lib/auth/useAuth";
import { ProfileMenu } from "./ProfileMenu";

export function LandingHeader() {
  const { status, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useDismissOnOutsideClick<HTMLDivElement>(menuOpen, () =>
    setMenuOpen(false),
  );

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link className="text-base font-semibold text-foreground" href="/">
        온설
      </Link>
      <nav aria-label="랜딩 진입" className="flex items-center gap-2">
        <ProfileMenu
          activePath="/"
          logout={logout}
          menuRef={menuRef}
          open={menuOpen}
          status={status}
          user={user}
          onClose={() => setMenuOpen(false)}
          onToggle={() => setMenuOpen((open) => !open)}
        />
      </nav>
    </header>
  );
}
