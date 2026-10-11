"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { EditorToolbar } from "./editor-toolbar";
import { Document } from "@/types/document";
import { createClient } from "@/utils/supabase/client";
import { formatTimeAgo } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  Save,
  Shield,
  Eye,
  Edit3,
  Clock,
  Sparkles,
  Share2,
} from "lucide-react";
import { ShareDialog } from "./share-dialog";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface DocumentEditorProps {
  initialDocument: Document;
  currentUser: {
    id: string;
    email: string;
  };
  permission: "owner" | "editor" | "viewer";
}

export function DocumentEditor({
  initialDocument,
  currentUser,
  permission,
}: DocumentEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const isOwner = permission === "owner";
  const canEdit = permission === "owner" || permission === "editor";

  // State
  const [title, setTitle] = useState(initialDocument.title || "Untitled Document");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string>(initialDocument.updated_at);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Version sequence to protect against stale async responses
  const versionRef = useRef<number>(0);
  const latestSavedVersionRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parse initial content safely (handle JSONB object or string or empty)
  const getParsedInitialContent = useCallback(() => {
    const raw = initialDocument.content;
    if (!raw) {
      return { type: "doc", content: [{ type: "paragraph" }] };
    }
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: raw }] }],
        };
      }
    }
    return raw;
  }, [initialDocument.content]);

  // Execute Supabase update
  const saveDocumentContent = useCallback(
    async (contentToSave: unknown, targetVersion: number) => {
      if (!canEdit) return;

      setSaveStatus("saving");
      setErrorMessage(null);

      try {
        const { error } = await supabase
          .from("documents")
          .update({
            content: contentToSave as any,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialDocument.id);

        if (error) {
          // If the tables have not been migrated yet, display understandable error
          setSaveStatus("error");
          setErrorMessage(error.message);
          return;
        }

        // Concurrency guard: Only mark saved if this response corresponds to the newest edit
        if (targetVersion >= versionRef.current) {
          latestSavedVersionRef.current = targetVersion;
          setSaveStatus("saved");
          setLastSavedAt(new Date().toISOString());
        }
      } catch (err: unknown) {
        setSaveStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to persist document to database."
        );
      }
    },
    [canEdit, initialDocument.id, supabase]
  );

  // Initialize Tiptap editor once with StarterKit + Underline
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
    ],
    content: getParsedInitialContent(),
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap prose dark:prose-invert max-w-none focus:outline-none p-6 sm:p-10 min-h-[500px]",
      },
    },
    onUpdate: ({ editor }) => {
      if (!canEdit) return;

      // Increment edit version
      versionRef.current += 1;
      const currentVer = versionRef.current;
      setSaveStatus("unsaved");

      // Clear existing debounce timer
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounced autosave after 1200ms of inactivity
      saveTimeoutRef.current = setTimeout(() => {
        const jsonContent = editor.getJSON();
        saveDocumentContent(jsonContent, currentVer);
      }, 1200);
    },
  });

  // Explicit Save action
  const handleExplicitSave = () => {
    if (!editor || !canEdit) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    const currentVer = ++versionRef.current;
    const jsonContent = editor.getJSON();
    saveDocumentContent(jsonContent, currentVer);
  };

  // Document Title Rename handler (Owner only)
  const handleTitleSubmit = async () => {
    setIsRenaming(false);
    const trimmedTitle = title.trim() || "Untitled Document";
    setTitle(trimmedTitle);

    if (trimmedTitle === initialDocument.title) return;

    if (!isOwner) {
      setRenameError("Only the document owner can rename this document.");
      return;
    }

    try {
      const { error } = await supabase
        .from("documents")
        .update({
          title: trimmedTitle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", initialDocument.id);

      if (error) {
        setRenameError(error.message);
      } else {
        setLastSavedAt(new Date().toISOString());
        setRenameError(null);
      }
    } catch {
      setRenameError("Error connecting to database to rename.");
    }
  };

  // Warn user on leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === "unsaved" || saveStatus === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [saveStatus]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 dark:bg-zinc-950 font-sans">
      {/* Top Navigation & Status Bar */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90 sm:px-6">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition shrink-0"
            title="Return to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />

          {/* Title Editor / Display */}
          <div className="min-w-0 flex-1 max-w-md">
            {isOwner ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Untitled Document"
                className="w-full truncate rounded-md px-2 py-1 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-900"
              />
            ) : (
              <span className="truncate block px-2 py-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {title}
              </span>
            )}
          </div>
        </div>

        {/* Right: Save Status & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Permission Badge */}
          <div className="hidden sm:flex items-center">
            {isOwner ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Shield className="h-3 w-3" />
                Owner
              </span>
            ) : permission === "editor" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <Edit3 className="h-3 w-3" />
                Editor
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Eye className="h-3 w-3" />
                Viewer (Read-only)
              </span>
            )}
          </div>

          {/* Save Status Indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === "saving" && (
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden md:inline">Saving...</span>
              </div>
            )}
            {saveStatus === "saved" && (
              <div
                className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400"
                title={`Saved ${formatTimeAgo(lastSavedAt)}`}
              >
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span className="hidden md:inline">Saved</span>
              </div>
            )}
            {saveStatus === "unsaved" && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Unsaved</span>
              </div>
            )}
            {saveStatus === "error" && (
              <div
                className="flex items-center gap-1 text-red-600 dark:text-red-400 cursor-pointer"
                onClick={handleExplicitSave}
                title={errorMessage || "Save failed. Click to retry."}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="hidden md:inline font-medium">Save failed (Retry)</span>
              </div>
            )}
          </div>

          {/* Share Button (Owner only) */}
          {isOwner && (
            <button
              onClick={() => setIsShareOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              title="Share document with collaborators"
            >
              <Share2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Share</span>
            </button>
          )}

          {/* Explicit Save Button */}
          {canEdit && (
            <button
              onClick={handleExplicitSave}
              disabled={saveStatus === "saving"}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
            </button>
          )}
        </div>
      </header>

      {/* Rename Error Banner */}
      {renameError && (
        <div className="bg-red-50 px-4 py-2 text-center text-xs text-red-700 dark:bg-red-950/60 dark:text-red-300 border-b border-red-200 dark:border-red-900/40">
          {renameError}
        </div>
      )}

      {/* Save Error Banner */}
      {saveStatus === "error" && errorMessage && (
        <div className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-b border-amber-200 dark:border-amber-900/40">
          Database note: {errorMessage}
        </div>
      )}

      {/* Editor Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          {/* Formatting Toolbar */}
          <EditorToolbar editor={editor} disabled={!canEdit} />

          {/* Content Area */}
          <div className="min-h-[550px] bg-white dark:bg-zinc-900">
            <EditorContent editor={editor} />
          </div>
        </div>
      </main>

      {/* Share Dialog (Owner only) */}
      {isOwner && (
        <ShareDialog
          documentId={initialDocument.id}
          documentTitle={title}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          ownerEmail={currentUser.email}
        />
      )}
    </div>
  );
}
