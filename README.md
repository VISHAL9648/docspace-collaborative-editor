# DocSpace — Collaborative Document Editor

DocSpace is a lightweight collaborative document editor built for the **Full Stack Product Engineer assessment**. It combines rich-text editing, secure document sharing, file imports, and persistent database storage using Next.js and Supabase.

## Features

- **Rich-text editor:** Create, rename, edit, save, and reopen documents with headings, bold, italic, underline, lists, blockquotes, and inline code.
- **Authentication:** Email/password login and signup with persistent sessions.
- **Document dashboard:** View owned and shared documents, search by title, and sort by recent activity.
- **Document sharing:** Owners can share documents with collaborators as viewers or editors and revoke access.
- **Role-based permissions:** Viewers have read-only access, editors can modify content, and owners control document management and sharing.
- **File import:** Upload `.txt`, `.md`, and `.markdown` files up to 1 MB and import their contents into editable documents.
- **Autosave:** Debounced autosaving, manual save, and protection against stale network responses.
- **Database security:** Supabase PostgreSQL with Row Level Security (RLS) policies.
- **Responsive UI:** A workspace designed for desktop and mobile screens.

## Tech Stack

| Category | Technologies |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| UI | React, Tailwind CSS |
| Rich-text editing | Tiptap |
| Authentication | Supabase Auth, `@supabase/ssr` |
| Database | Supabase PostgreSQL |
| Security | PostgreSQL Row Level Security |
| Icons | Lucide React |
| Testing | Node.js Test Runner / Vitest |

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- A Supabase account and project

## Getting Started

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd docspace-collaborative-editor
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Use the actual values from your Supabase project settings. Keep secret and service-role keys out of frontend-accessible environment variables.

### 4. Configure the database

Locate the migration file:

```text
supabase/migrations/20261011152500_create_documents_and_shares.sql
```

To apply it:

1. Open your Supabase Dashboard.
2. Navigate to **SQL Editor**.
3. Create a new query.
4. Paste the migration SQL.
5. Run the query and verify that the tables, indexes, triggers, and RLS policies are created.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Accounts

Create the following accounts in **Supabase Dashboard → Authentication → Users**.

| Role | Email | Password |
|---|---|---|
| Owner | `alex@example.com` | `DocSpaceDemo2026!` |
| Collaborator | `jordan@example.com` | `DocSpaceDemo2026!` |

Create both users with email confirmation enabled at creation time, if the dashboard provides that option. The accounts must exist in the same Supabase project configured for the application.

The login page provides demo-account autofill buttons, if enabled in the current build.

**Security note:** These are assessment demo credentials only. Do not use these credentials for real accounts or production users.

## File Import

Supported extensions:

- `.txt`
- `.md`
- `.markdown`

Maximum file size: **1 MB (1,048,576 bytes)**.

Markdown imports support headings, paragraphs, bold, italic, bullet lists, numbered lists, and blockquotes. Imported content is converted into the editor's document structure rather than evaluated as raw HTML.

## Testing

Run the automated tests:

```bash
npm test
```

Run TypeScript validation:

```bash
npx tsc --noEmit
```

The existing project documentation reports 17 passing tests across five test suites. Run the commands above to verify the current checkout.

## Deployment

### Deploy with Vercel

1. Push the project to GitHub.
2. Import the repository into [Vercel](https://vercel.com/).
3. Configure the required Supabase environment variables in the Vercel project settings.
4. Use `npm run build` as the build command if required by the project configuration.
5. Deploy the application.
6. Open the generated Vercel URL and test authentication, document creation, editing, sharing, and file imports.

Make sure the Supabase database migration has been applied and both demo accounts have been created before testing the deployed application.

## Current Limitations

- Real-time collaborative cursor presence and CRDT-based editing are not implemented.
- Image and video embeds are not currently supported.
- Export to PDF and DOCX is outside the current scope.

## License

This project was developed for a full-stack product engineering assessment.
