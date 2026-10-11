# DocSpace Supabase Database Setup & RLS Guide

This guide documents the PostgreSQL database schema, Row Level Security (RLS) policies, and instructions for applying the migration for **DocSpace**.

---

## 1. Migration Overview

The migration file is located at:
`supabase/migrations/20261011152500_create_documents_and_shares.sql`

It provisions:
1. **`public.documents` table**:
   - `id`: UUID Primary Key (`gen_random_uuid()`)
   - `title`: Document title (`text`, defaults to `'Untitled Document'`)
   - `content`: Structured JSONB document for Tiptap editor (`jsonb`, defaults to `'{"type": "doc", "content": []}'`)
   - `owner_id`: Authenticated user UUID referencing `auth.users(id)` (`ON DELETE CASCADE`)
   - `created_at`: Creation timestamp with timezone
   - `updated_at`: Last modification timestamp with timezone

2. **`public.document_shares` table**:
   - `id`: UUID Primary Key (`gen_random_uuid()`)
   - `document_id`: Foreign key referencing `public.documents(id)` (`ON DELETE CASCADE`)
   - `shared_with_user_id`: Foreign key referencing `auth.users(id)` (`ON DELETE CASCADE`)
   - `permission`: Access level restricted to `'viewer'` or `'editor'`
   - `created_at`: Share creation timestamp
   - **Unique constraint**: `unique (document_id, shared_with_user_id)` preventing duplicate share entries for the same user.

3. **Indexes**:
   - `idx_documents_owner_id`: Quick query of documents owned by a user
   - `idx_documents_updated_at`: Fast sorting by recent activity
   - `idx_document_shares_document_id`: Fast lookup of users sharing a document
   - `idx_document_shares_shared_with_user_id`: Fast lookup of documents shared with a user
   - `idx_document_shares_composite`: Combined lookup on `(document_id, shared_with_user_id, permission)`

4. **Triggers & Automated Rules**:
   - `handle_updated_at()`: Automatically refreshes `updated_at` timestamp on every document update.
   - `enforce_document_mutation_rules()`:
     - Disallows client mutation of `owner_id` under all circumstances (prevents account takeover).
     - Allows owners to rename and update all fields.
     - Allows shared `editor`s to update `content`, but rejects any changes to `title` (only owners can rename).
     - Disallows `viewer`s from modifying documents.

5. **Helper Functions**:
   - `is_document_owner(target_doc_id, check_user_id)`: `SECURITY DEFINER` function that prevents RLS infinite recursion when evaluating share permissions.
   - `get_document_share_permission(target_doc_id, check_user_id)`: Retrieves share role securely.

---

## 2. Row Level Security (RLS) Rules & Ownership Model

RLS is enabled on both `documents` and `document_shares`.

| Operation | Table | Allowed Roles | Enforcement Mechanism |
|---|---|---|---|
| **SELECT** | `documents` | Owner or Shared Users (`viewer` / `editor`) | RLS Policy: `owner_id = auth.uid() OR EXISTS in document_shares` |
| **INSERT** | `documents` | Authenticated Owner | RLS Policy: `WITH CHECK (owner_id = auth.uid())` |
| **UPDATE (content)** | `documents` | Owner or Shared `editor` | RLS Policy + Trigger `enforce_document_mutation_rules` |
| **UPDATE (title)** | `documents` | Only Owner | Trigger `enforce_document_mutation_rules` raises exception for editors |
| **UPDATE (owner_id)** | `documents` | **Forbidden for all** | Trigger raises exception if `NEW.owner_id <> OLD.owner_id` |
| **DELETE** | `documents` | Only Owner | RLS Policy: `owner_id = auth.uid()` |
| **SELECT** | `document_shares` | Owner or Target Shared User | RLS Policy: `shared_with_user_id = auth.uid() OR is_document_owner(...)` |
| **INSERT** | `document_shares` | Only Owner | RLS Policy: `is_document_owner(...) AND shared_with_user_id <> auth.uid()` |
| **UPDATE** | `document_shares` | Only Owner | RLS Policy: `is_document_owner(...)` |
| **DELETE** | `document_shares` | Only Owner | RLS Policy: `is_document_owner(...)` |

---

## 3. How to Apply the Migration

### Option A: Via Supabase Web Dashboard (Recommended for quick setup)
1. Open your Supabase Project Dashboard ([https://supabase.com/dashboard](https://supabase.com/dashboard)).
2. Navigate to the **SQL Editor** from the left navigation bar.
3. Click **"New Query"**.
4. Copy the entire contents of `supabase/migrations/20261011152500_create_documents_and_shares.sql` and paste it into the query editor.
5. Click **"Run"**.
6. Verify the tables appear under **Table Editor** (`documents` and `document_shares`).

### Option B: Via Supabase CLI
If you have the Supabase CLI configured locally:
```bash
# Link project if not already linked:
supabase link --project-ref <your-project-ref>

# Push migration:
supabase db push
```

Or for local development with Docker:
```bash
supabase start
supabase migration up
```
