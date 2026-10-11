"use client";

import React from "react";
import { FileText, Star, Clock, Trash2, Eye, Edit3, Shield } from "lucide-react";
import { Document } from "@/types/document";
import { formatTimeAgo } from "@/lib/utils";

interface DocumentCardProps {
  document: Document;
  isOwner?: boolean;
  onSelect?: (doc: Document) => void;
  onToggleStar?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function DocumentCard({
  document,
  isOwner = true,
  onSelect,
  onToggleStar,
  onDelete,
}: DocumentCardProps) {
  const permission = document.permission || (isOwner ? "owner" : "viewer");

  return (
    <div
      onClick={() => onSelect?.(document)}
      className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs transition hover:border-zinc-300 hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
              {document.title}
            </h4>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              <Clock className="h-3 w-3" />
              <span>Updated {formatTimeAgo(document.updated_at)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar?.(document.id);
          }}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-amber-500 dark:hover:bg-zinc-800"
          aria-label="Star document"
        >
          <Star
            className={`h-4 w-4 ${
              document.is_favorite
                ? "fill-amber-400 text-amber-500"
                : "text-zinc-400"
            }`}
          />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <div>
          {isOwner ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Shield className="h-2.5 w-2.5" />
              Owner
            </span>
          ) : permission === "editor" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Edit3 className="h-2.5 w-2.5" />
              Editor
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <Eye className="h-2.5 w-2.5" />
              Viewer
            </span>
          )}
        </div>

        {isOwner && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(document.id);
            }}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition"
            title="Delete document (Owner only)"
          >
            <Trash2 className="h-3 w-3" />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  );
}
