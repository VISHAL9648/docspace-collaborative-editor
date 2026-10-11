"use client";

import React from "react";
import {
  FileText,
  Clock,
  Star,
  Trash2,
  FolderClosed,
  Plus,
  X,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onNewDocument: () => void;
  userEmail?: string;
  userName?: string;
  onSignOut?: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onNewDocument,
  userEmail = "user@docspace.dev",
  userName = "DocSpace User",
  onSignOut,
}: SidebarProps) {
  const navItems = [
    { id: "all", label: "All Documents", icon: FileText },
    { id: "owned", label: "My Documents", icon: FileText },
    { id: "shared", label: "Shared with me", icon: Users },
    { id: "recent", label: "Recent", icon: Clock },
    { id: "starred", label: "Starred", icon: Star },
    { id: "trash", label: "Trash", icon: Trash2 },
  ];

  const folders = [
    { id: "engineering", label: "Engineering RFCs" },
    { id: "product", label: "Product Specs" },
    { id: "notes", label: "Meeting Notes" },
  ];

  const initials = userName
    ? userName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : userEmail.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform duration-200 ease-in-out dark:border-zinc-800 dark:bg-zinc-950 md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Workspace & Header */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="block font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
                DocSpace
              </span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                Workspace
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 md:hidden dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewDocument();
              if (isOpen) onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Document</span>
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-2 pb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Navigation
            </div>
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      if (isOpen) onClose();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition cursor-pointer",
                      isActive
                        ? "bg-zinc-200/80 text-blue-600 dark:bg-zinc-800 dark:text-blue-400"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Categories */}
          <div>
            <div className="flex items-center justify-between px-2 pb-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <span>Categories</span>
            </div>
            <div className="space-y-0.5">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    onSelectTab(folder.id);
                    if (isOpen) onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition cursor-pointer",
                    activeTab === folder.id
                      ? "bg-zinc-200/80 text-blue-600 dark:bg-zinc-800 dark:text-blue-400"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
                  )}
                >
                  <FolderClosed className="h-4 w-4 shrink-0" />
                  <span className="truncate">{folder.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom User Profile & Sign Out Bar */}
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center justify-between rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition">
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 flex items-center justify-center font-semibold text-xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {userName}
                </p>
                <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {userEmail}
                </p>
              </div>
            </div>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="ml-1 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400 transition"
                title="Sign out of DocSpace"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
