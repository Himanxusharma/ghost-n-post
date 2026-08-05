"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SiteHeaderProps = {
  onOpenStyle: () => void;
};

export function SiteHeader({ onOpenStyle }: SiteHeaderProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    firstLinkRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className={`site-header${menuOpen ? " is-open" : ""}`}>
      <button
        ref={toggleRef}
        type="button"
        className="nav-toggle"
        aria-expanded={menuOpen}
        aria-controls="primary-nav"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
        <span aria-hidden className="nav-toggle-bars" />
      </button>

      <nav id="primary-nav" className="site-nav" aria-label="Primary">
        <Link
          ref={firstLinkRef}
          href="/"
          className="nav-home"
          onClick={closeMenu}
        >
          Home
        </Link>
        {isSignedIn ? (
          <>
            <Link href="/batch" onClick={closeMenu}>
              Batch
            </Link>
            <Link href="/analytics" onClick={closeMenu}>
              Analytics
            </Link>
            <Link href="/history" onClick={closeMenu}>
              History
            </Link>
            <Link href="/scheduled" onClick={closeMenu}>
              Scheduled
            </Link>
            <Link href="/connections" onClick={closeMenu}>
              Connections
            </Link>
            <Link href="/team" onClick={closeMenu}>
              Team
            </Link>
            <Link href="/extension" onClick={closeMenu}>
              Extension
            </Link>
            <button
              type="button"
              className="nav-ghost"
              onClick={() => {
                closeMenu();
                onOpenStyle();
              }}
            >
              Match my voice
            </button>
            <div className="nav-user">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: { width: "2rem", height: "2rem" },
                  },
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="History"
                    labelIcon={<MenuDot />}
                    href="/history"
                  />
                  <UserButton.Link
                    label="Connections"
                    labelIcon={<MenuDot />}
                    href="/connections"
                  />
                  <UserButton.Link
                    label="Team"
                    labelIcon={<MenuDot />}
                    href="/team"
                  />
                </UserButton.MenuItems>
              </UserButton>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="nav-ghost"
              onClick={() => {
                closeMenu();
                onOpenStyle();
              }}
            >
              Match my voice
            </button>
            {isLoaded ? (
              <div className="nav-auth">
                <Link href="/sign-in" className="nav-cta" onClick={closeMenu}>
                  Continue with Google
                </Link>
              </div>
            ) : (
              <span className="nav-auth-skeleton" aria-hidden />
            )}
          </>
        )}
      </nav>
    </header>
  );
}

function MenuDot() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <circle cx="7" cy="7" r="2.5" fill="currentColor" />
    </svg>
  );
}
