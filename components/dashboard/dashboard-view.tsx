"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { EmptyState } from "@/components/dashboard/empty-state";
import { DocumentCard } from "@/components/dashboard/document-card";
import { NewDocumentButton } from "@/components/dashboard/new-document-button";
import { ImportDocumentModal } from "@/components/dashboard/import-document-modal";
import { Document } from "@/types/document";
import { createClient } from "@/utils/supabase/client";
import {
  FileText,
  Users,
  AlertTriangle,
  ExternalLink,
  CheckCircle,
  Database,
  Sparkles,
  Upload,
} from "lucide-react";

interface DashboardUser {
  id: string;
  email: string;
  fullName?: string;
}

interface DashboardViewProps {
  currentUser: DashboardUser;
  initialOwnedDocuments?: Document[];
  initialSharedDocuments?: Document[];
  dbWarning?: string | null;
}

export function DashboardView({
  currentUser,
  initialOwnedDocuments = [],
  initialSharedDocuments = [],
  dbWarning = null,
}: DashboardViewProps) {
  const router = useRouter();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [ownedDocuments, setOwnedDocuments] = useState<Document[]>(initialOwnedDocuments);
  const [sharedDocuments, setSharedDocuments] = useState<Document[]>(initialSharedDocuments);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Sign out handler
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Create new document in Supabase
  const handleCreateDocument = async (title: string) => {
    const docTitle = title.trim() || "Untitled Document";

    try {
      const { data, error } = await supabase
        .from("documents")
        .insert({
          title: docTitle,
          owner_id: currentUser.id,
          content: { type: "doc", content: [] },
        })
        .select()
        .single();

      if (error) {
        // Fallback for demo if migration hasn't been applied to Supabase project yet
        const localDoc: Document = {
          id: "doc_" + Date.now().toString(36),
          title: docTitle,
          owner_id: currentUser.id,
          user_id: currentUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          permission: "owner",
          is_favorite: false,
        };
        setOwnedDocuments((prev) => [localDoc, ...prev]);
        setActionNotice(`Created "${docTitle}" (local fallback - apply database migration to persist to PostgreSQL)`);
      } else if (data) {
        const newDoc: Document = {
          id: data.id,
          title: data.title,
          content: data.content,
          owner_id: data.owner_id,
          user_id: data.owner_id,
          created_at: data.created_at,
          updated_at: data.updated_at,
          permission: "owner",
          is_favorite: false,
        };
        setOwnedDocuments((prev) => [newDoc, ...prev]);
        setActionNotice(`Document "${docTitle}" created! Opening editor...`);
        // Navigate to document editor
        router.push(`/documents/${data.id}`);
      }
    } catch {
      const fallbackDoc: Document = {
        id: "doc_" + Date.now().toString(36),
        title: docTitle,
        owner_id: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permission: "owner",
        is_favorite: false,
      };
      setOwnedDocuments((prev) => [fallbackDoc, ...prev]);
    }

    setTimeout(() => setActionNotice(null), 4000);
  };

  // Delete owned document
  const handleDeleteDocument = async (id: string) => {
    try {
      await supabase.from("documents").delete().eq("id", id);
    } catch {
      // Local list filter handles optimistic delete
    }
    setOwnedDocuments((prev) => prev.filter((doc) => doc.id !== id));
    setActionNotice("Document deleted.");
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Toggle favorite on document
  const handleToggleStar = (id: string) => {
    setOwnedDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id ? { ...doc, is_favorite: !doc.is_favorite } : doc
      )
    );
    setSharedDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id ? { ...doc, is_favorite: !doc.is_favorite } : doc
      )
    );
  };

  // Filter owned documents based on search & tab
  const filteredOwnedDocs = useMemo(() => {
    return ownedDocuments.filter((doc) => {
      const matchesSearch = doc.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === "starred") return Boolean(doc.is_favorite);
      if (activeTab === "trash") return Boolean(doc.is_archived);
      if (activeTab === "shared") return false;
      return true;
    });
  }, [ownedDocuments, searchQuery, activeTab]);

  // Filter shared documents based on search & tab
  const filteredSharedDocs = useMemo(() => {
    if (activeTab === "owned") return [];

    return sharedDocuments.filter((doc) => {
      const matchesSearch = doc.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === "starred") return Boolean(doc.is_favorite);
      if (activeTab === "trash") return Boolean(doc.is_archived);
      return true;
    });
  }, [sharedDocuments, searchQuery, activeTab]);

  const totalVisibleDocs = filteredOwnedDocs.length + filteredSharedDocs.length;

  const tabLabels: Record<string, string> = {
    all: "All Documents",
    owned: "My Documents",
    shared: "Shared with Me",
    recent: "Recent Documents",
    starred: "Starred Documents",
    trash: "Trash",
    engineering: "Engineering RFCs",
    product: "Product Specs",
    notes: "Meeting Notes",
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewDocument={() => handleCreateDocument("Untitled Document")}
        userEmail={currentUser.email}
        userName={currentUser.fullName || currentUser.email.split("@")[0]}
        onSignOut={handleSignOut}
      />

      {/* Main Container */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Navigation */}
        <TopNav
          onToggleSidebar={() => setSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTabLabel={tabLabels[activeTab] || "Documents"}
          userEmail={currentUser.email}
          onSignOut={handleSignOut}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Database Notice Banner (if schema needs migration run) */}
            {dbWarning && !bannerDismissed && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  <Database className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold">Supabase PostgreSQL Schema Setup:</span>
                    <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                      The PostgreSQL schema is ready in <code>supabase/migrations/20261011152500_create_documents_and_shares.sql</code>. Paste it in your Supabase SQL Editor to enable full server-side persistence and RLS.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setBannerDismissed(true)}
                  className="rounded px-2 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Notification alert for user action */}
            {actionNotice && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
                <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{actionNotice}</span>
              </div>
            )}

            {/* Header row */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {tabLabels[activeTab] || "Documents"}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Logged in as <span className="font-medium text-zinc-700 dark:text-zinc-300">{currentUser.email}</span>
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {totalVisibleDocs} {totalVisibleDocs === 1 ? "document" : "documents"}
                </span>

                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                  title="Import .md or .txt file (Max 1 MB)"
                >
                  <Upload className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Import file</span>
                </button>

                <NewDocumentButton
                  onDocumentCreated={handleCreateDocument}
                  size="sm"
                  label="New document"
                />
              </div>
            </div>

            {/* Content: Empty State vs Document Sections */}
            {totalVisibleDocs === 0 ? (
              <EmptyState
                onCreateDocument={handleCreateDocument}
                onImportDocument={() => setIsImportModalOpen(true)}
              />
            ) : (
              <div className="space-y-8">
                {/* Section 1: Owned Documents */}
                {activeTab !== "shared" && filteredOwnedDocs.length > 0 && (
                  <div>
                    <div className="mb-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-xs text-zinc-500">
                          My Documents ({filteredOwnedDocs.length})
                        </h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredOwnedDocs.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          isOwner={true}
                          onSelect={(d) => router.push(`/documents/${d.id}`)}
                          onToggleStar={handleToggleStar}
                          onDelete={handleDeleteDocument}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Shared Documents */}
                {activeTab !== "owned" && filteredSharedDocs.length > 0 && (
                  <div>
                    <div className="mb-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-xs text-zinc-500">
                          Shared with Me ({filteredSharedDocs.length})
                        </h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredSharedDocs.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          isOwner={false}
                          onSelect={(d) => router.push(`/documents/${d.id}`)}
                          onToggleStar={handleToggleStar}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Import Document Modal */}
      <ImportDocumentModal
        currentUserId={currentUser.id}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccessNotice={setActionNotice}
      />
    </div>
  );
}
