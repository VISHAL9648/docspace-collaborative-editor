# AI Workflow & Engineering Reflection

## 1. AI Tools Used

- **Google DeepMind Antigravity Coding Agent** (Gemini 3.7 Flash):
  - Primary pair-programming assistant for codebase inspection, Next.js App Router scaffolding, component construction, SQL migration authoring, and test generation.
- **Supabase Agent Skills** (`supabase`, `supabase-postgres-best-practices`):
  - Provided database best practices, RLS recursion prevention patterns, and PostgreSQL schema security guidelines.

---

## 2. Tasks Where AI Accelerated Implementation

1. **PostgreSQL RLS Policies & Recursion Prevention**:
   - AI identified the common circular recursion trap in PostgreSQL when `documents` RLS references `document_shares` while `document_shares` RLS simultaneously references `documents`.
   - Generated `SECURITY DEFINER` helper functions (`is_document_owner`) with explicit `search_path = public` to cleanly decouple policy evaluation.
2. **Tiptap AST Importer**:
   - Rapidly created the recursive Markdown-to-Tiptap JSON parser in `lib/importer.ts`, translating headings, lists, bold, and italic into ProseMirror block structures without relying on third-party HTML sanitizers.
3. **Responsive UI Scaffolding**:
   - Quickly designed consistent Tailwind CSS v4 layouts for the dashboard sidebar, top navigation, document card grid, and formatting toolbar.

---

## 3. Generated Suggestions Modified or Rejected

1. **Rejected: Blind Overwrite of Dashboard with Supabase Quickstart**:
   - *Initial Prompt/Suggestion*: The user pasted a snippet containing `<ul>{todos?.map(...)}</ul>` from the Supabase dashboard tutorial for `page.tsx`.
   - *Modification*: Rather than wiping out the DocSpace dashboard layout that was previously built, the suggestion was rejected. Instead, the DocSpace dashboard was connected to `documents` while preserving the full UI, and the tutorial snippet was placed at `app/todos/page.tsx` for isolation.
2. **Modified: Service Role Key in Server Actions for User Lookup**:
   - *Standard Suggestion*: Many generic tutorials suggest using `SUPABASE_SERVICE_ROLE_KEY` on the server to query `auth.admin.listUsers()`.
   - *Modification*: Rejected exposing or requiring the service-role key. Instead, created a PostgreSQL `SECURITY DEFINER` function (`share_document_by_email`) that looks up only the exact email in `auth.users` on the database server.
3. **Modified: Naive HTML Parsing for File Import**:
   - *Standard Suggestion*: Using an HTML parser with `dangerouslySetInnerHTML`.
   - *Modification*: Switched to a pure, safe Markdown-to-AST generator that outputs Tiptap nodes directly, completely neutralizing XSS attacks.

---

## 4. Verification Methodology

- **Automated Verification**:
  - Ran `npm test` verifying 17 automated tests covering file import size constraints, MIME validation, owner vs editor permissions, viewer read-only locks, and access revocation.
  - Executed `npx tsc --noEmit` across all steps to enforce zero TypeScript errors.
- **Security Audit**:
  - Confirmed `.env.local` is strictly in `.gitignore` and `.env.example` contains only placeholder values.
  - Verified no service-role secrets exist in client code.
- **User Experience Verification**:
  - Verified empty states, loading indicators, and error notices.
  - Built helpful guidance boxes when Supabase free SMTP rate limits are encountered.

---

## 5. Known Limitations of AI-Generated Code

1. **Package Version Compatibility**:
   - AI models can suggest outdated package versions or fail to predict peer-dependency conflicts (e.g. Vite/Vitest peer dependencies with Node types). Human intervention was required to select the native test runner for zero-dependency execution.
2. **Assumed Context / Overwrites**:
   - AI assistants can sometimes overwrite working components if instructed to paste a boilerplate tutorial. Careful review is essential to maintain working code and prevent regressions.
