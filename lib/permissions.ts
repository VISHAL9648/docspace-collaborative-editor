/**
 * Pure authorization and permission rules for DocSpace.
 * Encapsulates the security model matching PostgreSQL Row Level Security.
 */

export type DocumentRole = "owner" | "editor" | "viewer";

export interface DocumentRecord {
  id: string;
  owner_id: string;
}

export interface ShareRecord {
  document_id: string;
  shared_with_user_id: string;
  permission: "viewer" | "editor";
}

/**
 * Resolves a user's role on a given document
 */
export function resolveUserDocumentRole(
  userId: string | null | undefined,
  doc: DocumentRecord,
  shares: ShareRecord[] = []
): DocumentRole | null {
  if (!userId) return null;

  // 1. Owner check
  if (doc.owner_id === userId) {
    return "owner";
  }

  // 2. Shared permission lookup
  const userShare = shares.find(
    (s) => s.document_id === doc.id && s.shared_with_user_id === userId
  );

  if (userShare) {
    return userShare.permission;
  }

  // 3. No access
  return null;
}

/**
 * Checks if a role is permitted to modify document content (Tiptap JSON)
 */
export function canEditContent(role: DocumentRole | null): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Checks if a role is permitted to rename the document title (Owner-only)
 */
export function canRenameDocument(role: DocumentRole | null): boolean {
  return role === "owner";
}

/**
 * Checks if a role is permitted to delete the document (Owner-only)
 */
export function canDeleteDocument(role: DocumentRole | null): boolean {
  return role === "owner";
}

/**
 * Checks if a role is permitted to grant, modify, or revoke sharing (Owner-only)
 */
export function canManageSharing(role: DocumentRole | null): boolean {
  return role === "owner";
}

/**
 * Validates a share attempt by an owner
 */
export function validateShareRequest(
  callerRole: DocumentRole | null,
  ownerEmail: string,
  targetEmail: string,
  permission: string
): { valid: boolean; error?: string } {
  if (callerRole !== "owner") {
    return { valid: false, error: "Only the document owner can manage sharing." };
  }

  const cleanTarget = targetEmail?.trim().toLowerCase();
  const cleanOwner = ownerEmail?.trim().toLowerCase();

  if (!cleanTarget) {
    return { valid: false, error: "Recipient email is required." };
  }

  if (cleanTarget === cleanOwner) {
    return {
      valid: false,
      error: "You cannot share a document with yourself (you already own it).",
    };
  }

  if (permission !== "viewer" && permission !== "editor") {
    return {
      valid: false,
      error: "Invalid permission level. Allowed values: viewer, editor.",
    };
  }

  return { valid: true };
}
