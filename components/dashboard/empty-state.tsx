"use client";

import React from "react";
import { FileText, Sparkles, Upload } from "lucide-react";
import { NewDocumentButton } from "./new-document-button";

interface EmptyStateProps {
  onCreateDocument: (title: string) => void;
  onImportDocument?: () => void;
}

export function EmptyState({ onCreateDocument, onImportDocument }: EmptyStateProps) {
  const templates = [
    { title: "Blank document", description: "Start from a clean slate" },
    { title: "Project RFC / Spec", description: "Define goals, architecture, and milestones" },
    { title: "Weekly Meeting Notes", description: "Track agenda, discussion, and action items" },
  ];

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-8 sm:p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
      {/* Icon Graphic */}
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs dark:bg-blue-950/60 dark:text-blue-400">
        <FileText className="h-8 w-8" />
        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-zinc-900">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Main Copy */}
      <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        No documents found
      </h3>
      <p className="mt-2 max-w-sm text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
        Your workspace is ready. Create your first document or import existing notes (.txt, .md).
      </p>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <NewDocumentButton
          onDocumentCreated={onCreateDocument}
          size="md"
          label="New document"
        />

        {onImportDocument && (
          <button
            onClick={onImportDocument}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
          >
            <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Import file</span>
          </button>
        )}
      </div>

      {/* Starter Templates */}
      <div className="mt-10 w-full max-w-xl border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Or start from a quick template
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 text-left">
          {templates.map((tpl) => (
            <button
              key={tpl.title}
              onClick={() => onCreateDocument(tpl.title)}
              className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-3.5 shadow-2xs transition hover:border-blue-400 hover:shadow-xs dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-600 text-left"
            >
              <div>
                <span className="block text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {tpl.title}
                </span>
                <span className="mt-1 block text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {tpl.description}
                </span>
              </div>
              <span className="mt-3 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                Use template →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
