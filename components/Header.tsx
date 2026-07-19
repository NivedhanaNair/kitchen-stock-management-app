"use client";

import { signOut, useSession } from "next-auth/react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-foreground hover:bg-surface-muted"
        >
          &#9776;
        </button>
        <div className="flex flex-1 items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white">
            K
          </div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Kitchen Stock Manager
          </h1>
        </div>
        {session?.user && (
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">{session.user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn-secondary"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}