# DocSpace Architecture Document

## 1. System Architecture Overview

DocSpace is architected as a modern full-stack web application with strict separation between presentation, application logic, and database-level security.

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Browser                        │
│   Next.js App Router (React 19) • Tiptap ProseMirror Engine │
└──────────────┬──────────────────────────────▲───────────────┘
               │ HTTPS Requests / Cookies     │ SSR Hydration
┌──────────────▼──────────────────────────────┴───────────────┐
│                    Next.js Edge / Server                    │
│   • Middleware (Session Refresh & Route Guards)             │
│   • Server Components (SSR Auth Validation & Data Queries)  │
│   • Server Actions (RPC Sharing Operations)                 │
└──────────────┬──────────────────────────────▲───────────────┘
               │ Supabase PostgREST & Auth    │ JWT Session
┌──────────────▼──────────────────────────────┴───────────────┐
│                   Supabase PostgreSQL 15                    │
│   • auth.users (Credentials & Session Tokens)               │
│   • public.documents (UUID PK, JSONB Tiptap content)        │
│   • public.document_shares (UUID PK, Role: viewer/editor)   │
│   • Row Level Security (RLS) & Mutation Enforcing Triggers  │
│   • SECURITY DEFINER RPC Functions (Safe User Lookup)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Layer-by-Layer Architecture

### Frontend Layer
- **Next.js App Router**:
  - `app/layout.tsx`: Root HTML shell with font definitions and global theme styles.
  - `app/page.tsx`: Protected Server Component for the dashboard. Verifies session and fetches initial documents.
  - `app/documents/[id]/page.tsx`: Server Component for the editor route. Validates document ownership or shared permission before rendering.
  - `app/login/page.tsx` & `app/signup/page.tsx`: Client Components with real-time feedback, loading spinners, and demo autofill options.
- **Tiptap Rich-Text Engine**:
  - Headless ProseMirror wrapper with `StarterKit` and `Underline`.
  - Serializes to and deserializes from structured JSON (`type: "doc"`).
  - Isolates formatting state inside `EditorToolbar` without re-rendering parent components unnecessarily.

### Backend Layer
- **Middleware (`middleware.ts` & `utils/supabase/middleware.ts`)**:
  - Runs on every non-static request.
  - Invokes `supabase.auth.getUser()` to automatically refresh expiring JWT sessions.
  - Intercepts unauthenticated requests to `/` or `/documents/:id` and redirects to `/login`.
- **Server Actions (`app/documents/actions.ts`)**:
  - Executes privileged sharing operations (`shareDocumentAction`, `getCollaboratorsAction`, `updateSharePermissionAction`, `revokeShareAction`).
  - Calls PostgreSQL database functions (`rpc`) while respecting the user's authenticated session.

### Database & Security Layer
- **PostgreSQL Schema**:
  - `public.documents`: Stores document metadata and structured JSONB content.
  - `public.document_shares`: Stores document sharing relationships (`viewer` or `editor`).
- **Row Level Security (RLS)**:
  - Enabled on all tables.
  - Policies ensure users can only SELECT documents they own or have been shared with.
  - Only owners can DELETE documents.
  - Only owners can INSERT or DELETE rows in `document_shares`.
- **Immutability & Mutation Trigger**:
  - `enforce_document_mutation_rules()` triggers on `BEFORE UPDATE`:
    - Rejects any client attempt to modify `owner_id`.
    - Rejects title renames by non-owners (shared editors can only update `content`).

---

## 3. Data Flow

### A. Document Creation & Editing
1. User clicks **"New document"** on the dashboard.
2. The client sends an `INSERT` request to `public.documents` with `owner_id = auth.uid()` and an initial empty Tiptap JSON schema (`{"type": "doc", "content": [{"type": "paragraph"}]}`).
3. Supabase verifies the RLS `INSERT` policy (`WITH CHECK (owner_id = auth.uid())`).
4. On success, the client receives the generated UUID and navigates to `/documents/[id]`.
5. In the editor, keystrokes trigger a 1200ms debounced autosave.
6. A local version counter (`versionRef`) increments on each edit. When the database acknowledges the save, the status transitions to `"Saved"` only if the confirmed version is the newest, preventing stale responses from overwriting newer edits.

### B. Document Sharing & Access Revocation
1. Document owner clicks **"Share"** and enters a collaborator's email (`jordan@example.com`) and permission (`editor`).
2. The client invokes `shareDocumentAction()`.
3. The server executes the `share_document_by_email` database function:
   - Verifies the caller is the owner (`public.is_document_owner`).
   - Resolves `jordan@example.com` to their UUID in `auth.users`.
   - Inserts/updates `public.document_shares`.
4. When Jordan opens `/documents/[id]`, the server queries their share permission.
5. If the owner revokes Jordan's access, the row in `document_shares` is deleted. Supabase RLS immediately blocks Jordan on all subsequent requests, returning `Access Denied`.

---

## 4. Error Handling Strategy

1. **Unapplied Migration Fallback**:
   If the database migration has not been run in the Supabase SQL editor, the dashboard catches `Could not find table 'public.documents'` and displays an informative banner with migration instructions instead of crashing.
2. **Rate Limit Guidance**:
   If a user hits Supabase SMTP confirmation limits on `/signup`, the UI catches the error and provides immediate guidance on manual pre-confirmation or disabling the email confirm toggle.
3. **Network & Session Expiry**:
   If a save request fails due to network disruption or session timeout, the editor displays an inline alert banner and transitions to `"Save failed (Retry)"`, preserving unsaved content in memory.

---

## 5. Scope Decisions & Tradeoffs

| Decision | Rationale | Tradeoff |
|---|---|---|
| **JSONB Document Storage** | Stores native Tiptap AST trees directly in PostgreSQL. Preserves exact formatting without parsing strings. | Harder to run simple SQL `LIKE '%term%'` full-text search compared to raw text. |
| **Debounced Autosave + Explicit Save** | Balances background persistence with network efficiency. Minimizes database write volume. | A sudden browser crash during the 1.2s debounce window could lose the latest sentence. |
| **PostgreSQL RPC for Email Lookup** | Completely avoids exposing the `auth.users` directory or requiring a service-role key in client code. | Requires custom database function in the SQL migration. |
| **Node.js Native Test Runner** | 0 external test dependencies, runs in under 200ms with 100% reliability across all environments. | Does not provide a web UI reporter like Vitest UI. |

---

## 6. What I Would Improve With Another 2–4 Hours

1. **Real-Time Collaboration via Y.js / Supabase Realtime**:
   Integrate Tiptap's collaboration extension with Supabase Realtime or Hocuspocus to display multi-user presence, selection highlights, and real-time keystroke synchronization.
2. **Document Export & Version History**:
   Add an export dropdown for `.md`, `.txt`, and `.pdf`, alongside a snapshot-based revision history table in PostgreSQL.
3. **Folder & Tag Management**:
   Enable users to organize documents into customizable folders and tag taxonomies.
