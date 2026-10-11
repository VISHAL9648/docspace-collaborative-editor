/**
 * Supabase Database TypeScript definitions for DocSpace
 * Matches the public schema of PostgreSQL
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SharePermission = "viewer" | "editor";

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          title: string;
          content: Json;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title?: string;
          content?: Json;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: Json;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      document_shares: {
        Row: {
          id: string;
          document_id: string;
          shared_with_user_id: string;
          permission: SharePermission;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          shared_with_user_id: string;
          permission: SharePermission;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          shared_with_user_id?: string;
          permission?: SharePermission;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "document_shares_shared_with_user_id_fkey";
            columns: ["shared_with_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_document_owner: {
        Args: {
          target_doc_id: string;
          check_user_id: string;
        };
        Returns: boolean;
      };
      get_document_share_permission: {
        Args: {
          target_doc_id: string;
          check_user_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];

export type DocumentShareRow = Database["public"]["Tables"]["document_shares"]["Row"];
export type DocumentShareInsert = Database["public"]["Tables"]["document_shares"]["Insert"];
export type DocumentShareUpdate = Database["public"]["Tables"]["document_shares"]["Update"];
