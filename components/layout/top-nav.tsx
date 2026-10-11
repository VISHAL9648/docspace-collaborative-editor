"use client";

import React from "react";
import { Menu, Search, Bell, Sparkles, LogOut } from "lucide-react";

interface TopNavProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTabLabel: string;
  userEmail?: string;
  onSignOut?: () => void;
}

export function TopNav({
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  activeTabLabel,
  userEmail,
  onSignOut,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-6">
      {/* Left section: mobile hamburger & title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 md:hidden dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:text-base">
            {activeTabLabel}
          </span>
          <span className="hidden items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300 sm:inline-flex">
            PostgreSQL Live
          </span>
        </div>
      </div>

      {/* Middle & Right section: Search bar & Actions */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative w-36 sm:w-64 md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50/70 py-1.5 pl-9 pr-7 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-blue-500 dark:focus:bg-zinc-900"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              ×
            </button>
          )}
        </div>

        {/* User indicator & Sign Out on top nav */}
        <div className="flex items-center gap-2">
          {userEmail && (
            <span className="hidden lg:inline text-xs font-medium text-zinc-500 dark:text-zinc-400 max-w-[150px] truncate">
              {userEmail}
            </span>
          )}

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-red-600 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-red-400 transition cursor-pointer"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
