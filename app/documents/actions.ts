"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export interface Collaborator {
  share_id: string;
  user_id: string;
  email: string;
  permission: "viewer" | "editor";
  created_at: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Share document with an existing user by email
 */
export async function shareDocumentAction(
  documentId: string,
  email: string,
  permission: "viewer" | "editor"
): Promise<ActionResult<any>> {
  if (!documentId || !email) {
    return { success: false, error: "Document ID and email are required." };
  }

  if (permission !== "viewer" && permission !== "editor") {
    return { success: false, error: "Invalid permission level." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return { success: false, error: "Authentication required." };
  }

  // Call PostgreSQL RPC function to securely resolve user by email and insert share
  const { data, error } = await supabase.rpc("share_document_by_email", {
    p_document_id: documentId,
    p_email: email.trim().toLowerCase(),
    p_permission: permission,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/");
  return { success: true, data };
}

/**
 * Server Action: Get all current collaborators for a document (Owner only)
 */
export async function getCollaboratorsAction(
  documentId: string
): Promise<ActionResult<Collaborator[]>> {
  if (!documentId) {
    return { success: false, error: "Document ID is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return { success: false, error: "Authentication required." };
  }

  const { data, error } = await supabase.rpc("get_document_collaborators", {
    p_document_id: documentId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

/**
 * Server Action: Update a collaborator's permission (Owner only)
 */
export async function updateSharePermissionAction(
  shareId: string,
  documentId: string,
  permission: "viewer" | "editor"
): Promise<ActionResult> {
  if (!shareId || !permission) {
    return { success: false, error: "Share ID and permission are required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return { success: false, error: "Authentication required." };
  }

  const { error } = await supabase.rpc("update_document_share_permission", {
    p_share_id: shareId,
    p_permission: permission,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/documents/${documentId}`);
  return { success: true };
}

/**
 * Server Action: Revoke document access for a collaborator (Owner only)
 */
export async function revokeShareAction(
  shareId: string,
  documentId: string
): Promise<ActionResult> {
  if (!shareId) {
    return { success: false, error: "Share ID is required." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return { success: false, error: "Authentication required." };
  }

  const { error } = await supabase.rpc("revoke_document_share", {
    p_share_id: shareId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/");
  return { success: true };
}
