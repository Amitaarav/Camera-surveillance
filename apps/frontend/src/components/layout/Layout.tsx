import { useState } from "react"
import { Link, Outlet } from "@tanstack/react-router";
import { useLogout, useMe } from "../../features/auth/hooks";
import { Bell, Search, X } from "lucide-react";
import { Input } from "../ui/input";
import { WebSocketProvider } from "../../realtime/WebSocketProvider";

export function Layout() {
  const logout = useLogout();
  const { data } = useMe();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const userName = data?.user?.name || "Admin";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AD";

  return (
    <WebSocketProvider>
      <div className="bg-background">
        <header className="sticky w-full top-0 z-40 border-b border-border bg-card shadow-subtle backdrop-blur">
          <div className="mx-auto flex h-14 w-full items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <span className="font-semibold tracking-tight text-text-primary">
                Camera Surveillance
              </span>
            </Link>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-4 ml-4">
              <Link
                to="/"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors [&.active]:text-primary"
              >
                Dashboard
              </Link>
              <Link
                to="/alerts"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors [&.active]:text-primary"
              >
                Alerts
              </Link>
            </nav>

          {/* Desktop search — flex-1 fills the gap, naturally pushing actions right */}
          <div className="hidden flex-1 justify-center md:flex">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                type="search"
                placeholder="Search cameras, events..."
                className="h-8 border-transparent bg-surface-hover pl-9 pr-12 focus-visible:border-border-focus"
              />
              <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-text-muted sm:inline-block">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {/* Mobile search trigger — replaces the old "no search on mobile" gap */}
            <button
              onClick={() => setShowMobileSearch((prev) => !prev)}
              aria-label={showMobileSearch ? "Close search" : "Open search"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary md:hidden"
            >
              {showMobileSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>

            <button
              aria-label="Notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger ring-2 ring-card" />
            </button>

            <div className="hidden h-4 w-px bg-border sm:block" />

            <div
              title={userName}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
            >
              {initials}
            </div>

            <button
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              aria-label="Logout"
              title="Logout"
              className="flex h-8 items-center gap-1.5 rounded-lg p-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-danger hover:font-bold disabled:opacity-50"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile search bar — slides in below header on toggle */}
        {showMobileSearch && (
          <div className="animate-fade-in border-t border-border px-4 py-3 md:hidden">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                type="search"
                placeholder="Search cameras, events..."
                autoFocus
                className="h-9 border-transparent bg-surface-hover pl-9 focus-visible:border-border-focus"
              />
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <Outlet />
      </main>

      <footer className="sticky border-t border-border bg-card px-4 py-4 text-center text-xs text-text-muted sm:px-6 lg:px-8">
        <p>
          Camera Surveillance &copy; {new Date().getFullYear()} — v{__APP_VERSION__}
        </p>
        <p className="mt-1">Developed by Amit</p>
      </footer>
    </div>
    </WebSocketProvider>
  );
}