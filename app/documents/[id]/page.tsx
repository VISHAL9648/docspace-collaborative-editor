import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DocumentEditor } from "@/components/editor/document-editor";
import { Document } from "@/types/document";
import { FileQuestion, ArrowLeft, ShieldAlert } from "lucide-react";

interface DocumentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    redirect("/login");
  }

  // 1. Fetch document from Supabase
  const { data: docData, error: docError } = await supabase
    .from("documents")
    .select("id, title, content, owner_id, created_at, updated_at")
    .eq("id", id)
    .single();

  // Document not found or database error
  if (docError || !docData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 text-center dark:bg-zinc-950 font-sans">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <FileQuestion className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Document not found
        </h2>
        <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          This document may have been deleted, moved, or you may need to apply the database migration in Supabase.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  // 2. Determine permissions
  let permission: "owner" | "editor" | "viewer" = "viewer";

  if (docData.owner_id === user.id) {
    permission = "owner";
  } else {
    // Check shared permissions
    const { data: shareData } = await supabase
      .from("document_shares")
      .select("permission")
      .eq("document_id", id)
      .eq("shared_with_user_id", user.id)
      .single();

    if (shareData) {
      permission = shareData.permission as "editor" | "viewer";
    } else {
      // Access denied
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 text-center dark:bg-zinc-950 font-sans">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Access Denied
          </h2>
          <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            You do not have permission to view or edit this document. Contact the document owner to request access.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      );
    }
  }

  const document: Document = {
    id: docData.id,
    title: docData.title,
    content: docData.content,
    owner_id: docData.owner_id,
    user_id: docData.owner_id,
    created_at: docData.created_at,
    updated_at: docData.updated_at,
    permission,
    is_favorite: false,
  };

  return (
    <DocumentEditor
      initialDocument={document}
      currentUser={{
        id: user.id,
        email: user.email || "user@docspace.dev",
      }}
      permission={permission}
    />
  );
}
