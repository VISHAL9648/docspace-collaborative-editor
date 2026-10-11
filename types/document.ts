/**
 * Document and User domain types for DocSpace
 */

import type { Json, SharePermission } from "./database";

// Tiptap structured JSON document format
export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
  }>;
  text?: string;
}

export interface TiptapDocument {
  type: "doc";
  content?: TiptapNode[];
}

export interface Document {
  id: string;
  title: string;
  content?: Json | string; // Structured JSON for Tiptap or serialized string
  owner_id?: string;
  user_id?: string; // Client alias for owner_id
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
  is_archived?: boolean;
  permission?: SharePermission | "owner";
}

export interface DocumentShare {
  id: string;
  document_id: string;
  shared_with_user_id: string;
  permission: SharePermission;
  created_at: string;
  user_email?: string;
}

export interface WorkspaceUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}
