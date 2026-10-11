import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Document } from "@/types/document";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Authenticate user via Supabase session cookies
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Protect route: Redirect unauthenticated requests to /login
  if (!user || authError) {
    redirect("/login");
  }

  let ownedDocuments: Document[] = [];
  let sharedDocuments: Document[] = [];
  let dbWarning: string | null = null;

  try {
    // 1. Fetch documents owned by the authenticated user
    const { data: ownedData, error: ownedError } = await supabase
      .from("documents")
      .select("id, title, content, owner_id, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    if (ownedError) {
      if (ownedError.message.includes("Could not find the table")) {
        dbWarning =
          "Database tables 'documents' and 'document_shares' are pending migration in your Supabase SQL editor.";
      }
    } else if (ownedData) {
      ownedDocuments = ownedData.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        owner_id: doc.owner_id,
        user_id: doc.owner_id,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        permission: "owner",
        is_favorite: false,
      }));
    }

    // 2. Fetch documents shared with the authenticated user
    const { data: sharesData } = await supabase
      .from("document_shares")
      .select("document_id, permission")
      .eq("shared_with_user_id", user.id);

    if (sharesData && sharesData.length > 0) {
      const sharedDocIds = sharesData.map((s) => s.document_id);
      const permissionMap = new Map(
        sharesData.map((s) => [s.document_id, s.permission])
      );

      const { data: sharedDocsData } = await supabase
        .from("documents")
        .select("id, title, content, owner_id, created_at, updated_at")
        .in("id", sharedDocIds)
        .order("updated_at", { ascending: false });

      if (sharedDocsData) {
        sharedDocuments = sharedDocsData.map((doc) => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          owner_id: doc.owner_id,
          user_id: doc.owner_id,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          permission: (permissionMap.get(doc.id) as "viewer" | "editor") || "viewer",
          is_favorite: false,
        }));
      }
    }
  } catch {
    dbWarning = "Could not connect to database. Please check Supabase credentials.";
  }

  const currentUser = {
    id: user.id,
    email: user.email || "user@docspace.dev",
    fullName: user.user_metadata?.full_name || undefined,
  };

  return (
    <DashboardView
      currentUser={currentUser}
      initialOwnedDocuments={ownedDocuments}
      initialSharedDocuments={sharedDocuments}
      dbWarning={dbWarning}
    />
  );
}
