# Vercel & Supabase Production Deployment Guide

This guide details the step-by-step procedure to deploy **DocSpace** to **Vercel** backed by **Supabase PostgreSQL & Auth**.

---

## Pre-Deployment Verification Summary

The codebase has undergone local verification before preparing this deployment guide:
- **Production Build:** `npm run build` compiled cleanly (`Route (app)` static & partial prerender generated without errors).
- **TypeScript:** Strict type checking passed with **0 errors**.
- **Automated Tests:** 17 tests passed across 5 suites (`npm test`).
- **Secret Hygiene:** `.env.local` is ignored in `.gitignore`. [`.env.example`](file:///g:/Google%20Docs/my-app/.env.example) contains only generic placeholders.
- **Resilience:** Added root [`app/not-found.tsx`](file:///g:/Google%20Docs/my-app/app/not-found.tsx), [`app/error.tsx`](file:///g:/Google%20Docs/my-app/app/error.tsx), and [`app/loading.tsx`](file:///g:/Google%20Docs/my-app/app/loading.tsx).

---

## Phase 1: Supabase Backend Setup

### 1. Create a Supabase Project (if starting fresh)
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and log in.
2. Click **New Project**.
3. Choose an Organization, Name (e.g. `docspace-prod`), Database Password, and Region closest to your users.
4. Wait ~2 minutes for the database to provision.

### 2. Apply Database Schema & Migrations
1. In your Supabase project dashboard, open the **SQL Editor** tab from the left sidebar.
2. Open the file [`supabase/migrations/20261011152500_create_documents_and_shares.sql`](file:///g:/Google%20Docs/my-app/supabase/migrations/20261011152500_create_documents_and_shares.sql) from this repository.
3. Copy its entire contents, paste them into the SQL Editor, and click **Run**.
4. Verify success:
   - Go to **Table Editor**: you should see the `documents` and `document_shares` tables.
   - Go to **Authentication > Policies**: verify that Row-Level Security (RLS) is enabled with policies on both tables.

### 3. Configure Supabase Auth & Redirect URLs
1. Navigate to **Authentication** > **URL Configuration**.
2. **Site URL:**
   - Set to your Vercel production URL (e.g., `https://your-docspace-app.vercel.app`).
   - If deploying for the first time, you can temporarily set `http://localhost:3000` and update it after Vercel gives you your production domain.
3. **Redirect URLs (Allow list):**
   Add the following paths:
   - `http://localhost:3000/auth/callback`
   - `https://your-docspace-app.vercel.app/auth/callback`
   - `https://*-<your-team>.vercel.app/auth/callback` *(optional, for Vercel preview branch deployments)*
4. **Email Confirmation (Optional / Recommended for testing):**
   - In **Authentication** > **Providers** > **Email**:
   - If you want immediate sign-ups without running into free-tier SMTP rate limits (3-4 confirmation emails/hr), toggle **Confirm email** to `OFF`.

---

## Phase 2: Deploying to Vercel

### Step 1: Push Code to Git
Make sure your latest code is committed and pushed to your GitHub/GitLab/Bitbucket repository:
```bash
git add .
git commit -m "feat: complete DocSpace with full permissions, tests, and production build readiness"
git push origin main
```

### Step 2: Import Project into Vercel
1. Log in to [https://vercel.com/dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import your Git repository.
4. Leave framework preset as **Next.js**.

### Step 3: Configure Environment Variables in Vercel
Before clicking Deploy, expand the **Environment Variables** section in Vercel and add:

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Your Supabase Project API URL (Found in Supabase: Project Settings > API) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` (or `anon` key) | Public Supabase publishable/anon key |
| `NEXT_PUBLIC_APP_URL` | `https://<your-project>.vercel.app` | Base URL used for email redirects & share links |

> [!CAUTION]
> Never commit `SUPABASE_SERVICE_ROLE_KEY` or expose it with `NEXT_PUBLIC_`. DocSpace is built entirely with client & server SSR sessions with Row-Level Security, meaning service role privileges are unnecessary.

### Step 4: Deploy
Click **Deploy**. Vercel will run `npm run build` and provision your application on edge infrastructure.

---

## Phase 3: Post-Deployment Smoke Test Checklist

Once your deployment is live on Vercel, execute these verification checks in order:

### 1. Authentication & Session Persistence
- [ ] Visit `https://your-project.vercel.app/signup` and create an owner test account (e.g. `alex@example.com`).
- [ ] Log out via the dashboard avatar menu.
- [ ] Log back in at `/login`.
- [ ] Refresh the page (`F5`) to confirm the session persists seamlessly without flashes.

### 2. Document Creation & Autosave
- [ ] Click **New Document**.
- [ ] Type a title and paragraph content.
- [ ] Notice the status indicator in the top toolbar transitioning: `Unsaved changes` ➔ `Saving...` ➔ `Saved`.
- [ ] Reopen the document from the dashboard to ensure formatting (headings, lists, bold) is fully restored from PostgreSQL.

### 3. Safe File Import
- [ ] On the dashboard, click **Import file**.
- [ ] Select or drag-and-drop a `.md` or `.txt` file (samples are available in `samples/welcome.md`).
- [ ] Verify the file converts into native editor blocks without evaluating unsafe HTML scripts.
- [ ] Confirm you are redirected to the imported document.

### 4. Collaborator Sharing & Permission Enforcement
- [ ] In an incognito window or second browser, register a second user (e.g. `jordan@example.com`).
- [ ] In the owner's window, click **Share**, enter `jordan@example.com`, and grant **Viewer** permission.
- [ ] In Jordan's session:
  - Verify the document appears under **Shared with me**.
  - Open the document: verify the editor is read-only and renaming/deleting are disabled.
- [ ] In the owner's window: change Jordan's role to **Editor**.
- [ ] In Jordan's session: verify Jordan can now edit content, but cannot rename or delete the document.
- [ ] In the owner's window: revoke Jordan's access.
- [ ] In Jordan's session: refresh to confirm access is immediately denied (`Access Denied` screen) and removed from their dashboard.

---

## Phase 4: Production Troubleshooting & Error States

- **Database Table Not Found:**
  - *Symptom:* Dashboard shows banner *"Database tables 'documents' and 'document_shares' are pending migration"*.
  - *Resolution:* Execute `supabase/migrations/20261011152500_create_documents_and_shares.sql` in the Supabase SQL Editor.
- **Auth Redirect Mismatch:**
  - *Symptom:* Email verification link redirects to localhost instead of Vercel.
  - *Resolution:* Add your production domain to **Supabase > Authentication > URL Configuration > Redirect URLs**.
- **Email Rate Limit Exceeded:**
  - *Symptom:* Signup fails with `email rate limit exceeded`.
  - *Resolution:* In Supabase Dashboard, go to **Authentication > Users** and manually create pre-confirmed users, or disable "Confirm email" under **Authentication > Providers > Email**.
