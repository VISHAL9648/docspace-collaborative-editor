"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Share2,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Shield,
  Eye,
  Edit3,
  User,
} from "lucide-react";
import {
  shareDocumentAction,
  getCollaboratorsAction,
  updateSharePermissionAction,
  revokeShareAction,
  Collaborator,
} from "@/app/documents/actions";

interface ShareDialogProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
  ownerEmail: string;
}

export function ShareDialog({
  documentId,
  documentTitle,
  isOpen,
  onClose,
  ownerEmail,
}: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"viewer" | "editor">("viewer");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actingShareId, setActingShareId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCollaborators = useCallback(async () => {
    setIsLoadingCollaborators(true);
    const res = await getCollaboratorsAction(documentId);
    if (res.success && res.data) {
      setCollaborators(res.data);
    }
    setIsLoadingCollaborators(false);
  }, [documentId]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      fetchCollaborators();
    }
  }, [isOpen, fetchCollaborators]);

  if (!isOpen) return null;

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setErrorMessage("Please enter an email address.");
      return;
    }

    if (targetEmail === ownerEmail.toLowerCase()) {
      setErrorMessage("You are already the owner of this document.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await shareDocumentAction(documentId, targetEmail, permission);

      if (!res.success) {
        setErrorMessage(res.error || "Failed to share document.");
      } else {
        setSuccessMessage(`Access granted to ${targetEmail} as ${permission}.`);
        setEmail("");
        fetchCollaborators();
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected sharing error occurred."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePermission = async (
    shareId: string,
    newPermission: "viewer" | "editor"
  ) => {
    setActingShareId(shareId);
    setErrorMessage(null);

    try {
      const res = await updateSharePermissionAction(
        shareId,
        documentId,
        newPermission
      );
      if (!res.success) {
        setErrorMessage(res.error || "Failed to update permission.");
      } else {
        setCollaborators((prev) =>
          prev.map((c) =>
            c.share_id === shareId ? { ...c, permission: newPermission } : c
          )
        );
      }
    } finally {
      setActingShareId(null);
    }
  };

  const handleRevokeShare = async (shareId: string, userEmail: string) => {
    setActingShareId(shareId);
    setErrorMessage(null);

    try {
      const res = await revokeShareAction(shareId, documentId);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to revoke access.");
      } else {
        setSuccessMessage(`Access revoked for ${userEmail}.`);
        setCollaborators((prev) => prev.filter((c) => c.share_id !== shareId));
      }
    } finally {
      setActingShareId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Dialog Box */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Share &ldquo;{documentTitle}&rdquo;
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage access and invite collaborators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error & Success Messages */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <p className="flex-1 leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <p className="flex-1 leading-relaxed">{successMessage}</p>
          </div>
        )}

        {/* Add Collaborator Form */}
        <form onSubmit={handleShareSubmit} className="mt-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="email"
                placeholder="Collaborator's email (e.g. jordan@example.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>

            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as "viewer" | "editor")}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs sm:text-sm font-medium text-zinc-700 focus:border-blue-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Invite</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Demo Autofill */}
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>Quick Assessment Collaborator:</span>
            <button
              type="button"
              onClick={() => setEmail("jordan@example.com")}
              className="text-blue-600 hover:underline dark:text-blue-400 font-medium"
            >
              jordan@example.com
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setEmail("alex@example.com")}
              className="text-blue-600 hover:underline dark:text-blue-400 font-medium"
            >
              alex@example.com
            </button>
          </div>
        </form>

        {/* Current Collaborators List */}
        <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
            People with access
          </h4>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {/* Owner Row */}
            <div className="flex items-center justify-between rounded-lg p-2 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 flex items-center justify-center font-semibold text-xs shrink-0">
                  <User className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    {ownerEmail}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Owner</p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Shield className="h-2.5 w-2.5" />
                Owner
              </span>
            </div>

            {/* Loading state */}
            {isLoadingCollaborators && (
              <div className="flex items-center justify-center py-4 text-xs text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading collaborators...</span>
              </div>
            )}

            {/* Collaborator Rows */}
            {!isLoadingCollaborators &&
              collaborators.map((c) => {
                const isActing = actingShareId === c.share_id;
                return (
                  <div
                    key={c.share_id}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-semibold text-xs text-zinc-700 dark:text-zinc-200 shrink-0">
                        {c.email.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {c.email}
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          Shared {new Date(c.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isActing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                      ) : (
                        <>
                          <select
                            value={c.permission}
                            onChange={(e) =>
                              handleUpdatePermission(
                                c.share_id,
                                e.target.value as "viewer" | "editor"
                              )
                            }
                            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRevokeShare(c.share_id, c.email)}
                            className="rounded p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition"
                            title="Revoke access"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

            {!isLoadingCollaborators && collaborators.length === 0 && (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic py-2 text-center">
                No collaborators yet. Enter an email above to share.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-100 px-4 py-1.5 text-xs sm:text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
