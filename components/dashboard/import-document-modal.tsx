"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  FileCode,
} from "lucide-react";
import {
  validateImportFile,
  processImportedFile,
  MAX_IMPORT_SIZE_BYTES,
} from "@/lib/importer";
import { createClient } from "@/utils/supabase/client";

interface ImportDocumentModalProps {
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccessNotice?: (msg: string) => void;
}

export function ImportDocumentModal({
  currentUserId,
  isOpen,
  onClose,
  onSuccessNotice,
}: ImportDocumentModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [fileContent, setFileContent] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setErrorMessage(null);

    // Validate size and extension
    const validation = validateImportFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid file.");
      setSelectedFile(null);
      return;
    }

    try {
      // Read safely in the browser as plain text
      const text = await file.text();

      if (!text.trim()) {
        setErrorMessage("The selected file is empty. Please choose a file with content.");
        return;
      }

      const { title } = processImportedFile(file.name, text);
      setSelectedFile(file);
      setDocTitle(title);
      setFileContent(text);
    } catch {
      setErrorMessage("Could not read file. Please ensure it is a valid text or markdown file.");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !fileContent) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { content } = processImportedFile(selectedFile.name, fileContent);
      const finalTitle = docTitle.trim() || selectedFile.name;

      const { data, error } = await supabase
        .from("documents")
        .insert({
          title: finalTitle,
          owner_id: currentUserId,
          content: content as any,
        })
        .select()
        .single();

      if (error) {
        setErrorMessage(
          `Database error: ${error.message}. (Ensure the database migration has been applied in Supabase).`
        );
        setIsProcessing(false);
        return;
      }

      if (data) {
        onSuccessNotice?.(`Imported "${finalTitle}" successfully! Opening editor...`);
        onClose();
        // Immediately navigate to the newly created document
        router.push(`/documents/${data.id}`);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred during import."
      );
      setIsProcessing(false);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setDocTitle("");
    setFileContent("");
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => !isProcessing && onClose()}
      />

      {/* Modal Box */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Import Document
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Convert Markdown or plain text into a DocSpace document
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <p className="flex-1 leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleImportSubmit} className="mt-4 space-y-4">
          {!selectedFile ? (
            /* Dropzone */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
                isDragOver
                  ? "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30"
                  : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/30 dark:hover:border-zinc-600"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300 mb-3">
                <FileCode className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Click to browse or drag & drop a file here
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Supported formats: <strong>.md</strong>, <strong>.txt</strong> (Max 1 MB)
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            /* Selected File Preview & Title Config */
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready to convert
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetSelection}
                  disabled={isProcessing}
                  className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                >
                  Change file
                </button>
              </div>

              <div>
                <label
                  htmlFor="import-title"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Document Title (derived from filename)
                </label>
                <input
                  id="import-title"
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Never evaluates untrusted HTML
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>

              {selectedFile && (
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      <span>Import &amp; Open</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
