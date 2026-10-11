-- ==============================================================================
-- DocSpace: Document Storage and Sharing Schema with Row Level Security (RLS)
-- ==============================================================================

-- 1. DOCUMENTS TABLE
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled Document',
  content jsonb not null default '{"type": "doc", "content": []}'::jsonb,
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. DOCUMENT SHARES TABLE
create table if not exists public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  shared_with_user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null check (permission in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  constraint unique_document_user_share unique (document_id, shared_with_user_id)
);

-- 3. INDEXES FOR QUERY OPTIMIZATION
create index if not exists idx_documents_owner_id 
  on public.documents(owner_id);

create index if not exists idx_documents_updated_at 
  on public.documents(updated_at desc);

create index if not exists idx_document_shares_document_id 
  on public.document_shares(document_id);

create index if not exists idx_document_shares_shared_with_user_id 
  on public.document_shares(shared_with_user_id);

create index if not exists idx_document_shares_composite 
  on public.document_shares(document_id, shared_with_user_id, permission);

-- 4. AUTOMATIC updated_at TRIGGER
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
  before update on public.documents
  for each row
  execute function public.handle_updated_at();

-- 5. HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- Check if a specific user owns the document
create or replace function public.is_document_owner(target_doc_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.documents
    where id = target_doc_id
      and owner_id = check_user_id
  );
$$;

-- Check if a user has a specific permission or any share on a document
create or replace function public.get_document_share_permission(target_doc_id uuid, check_user_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select permission
  from public.document_shares
  where document_id = target_doc_id
    and shared_with_user_id = check_user_id;
$$;

-- 6. FIELD-LEVEL AND OWNERSHIP PROTECTION TRIGGER
-- Enforces:
-- a) owner_id is immutable (preventing takeover).
-- b) Only owners can rename document title.
-- c) Shared editors can ONLY update content, never title or owner_id.
create or replace function public.enforce_document_mutation_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  curr_user_id uuid := auth.uid();
  user_permission text;
begin
  -- Disallow transferring ownership via client update
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Ownership cannot be changed or transferred via document updates.';
  end if;

  -- If the authenticated user is the document owner, allow full update
  if old.owner_id = curr_user_id then
    return new;
  end if;

  -- If not the owner, check shared permission
  select permission into user_permission
  from public.document_shares
  where document_id = old.id
    and shared_with_user_id = curr_user_id;

  if user_permission = 'editor' then
    -- Shared editors can update document content, but NOT title
    if new.title is distinct from old.title then
      raise exception 'Only the document owner can rename this document.';
    end if;
    return new;
  end if;

  -- Viewers or unshared users cannot update
  raise exception 'Unauthorized document update. Insufficient privileges.';
end;
$$;

drop trigger if exists trigger_enforce_document_mutation on public.documents;
create trigger trigger_enforce_document_mutation
  before update on public.documents
  for each row
  execute function public.enforce_document_mutation_rules();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on both tables
alter table public.documents enable row level security;
alter table public.document_shares enable row level security;

-- ==============================================================================
-- RLS POLICIES FOR: public.documents
-- ==============================================================================

-- SELECT: Owners can view their documents, and shared users (viewers/editors) can view shared documents
drop policy if exists "documents_select_policy" on public.documents;
create policy "documents_select_policy"
  on public.documents
  for select
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.document_shares s
      where s.document_id = documents.id
        and s.shared_with_user_id = (select auth.uid())
    )
  );

-- INSERT: Authenticated users can insert documents where they are set as owner
drop policy if exists "documents_insert_policy" on public.documents;
create policy "documents_insert_policy"
  on public.documents
  for insert
  with check (
    owner_id = (select auth.uid())
  );

-- UPDATE: Owners and shared editors can update documents (trigger further validates title & owner_id)
drop policy if exists "documents_update_policy" on public.documents;
create policy "documents_update_policy"
  on public.documents
  for update
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.document_shares s
      where s.document_id = documents.id
        and s.shared_with_user_id = (select auth.uid())
        and s.permission = 'editor'
    )
  )
  with check (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.document_shares s
      where s.document_id = documents.id
        and s.shared_with_user_id = (select auth.uid())
        and s.permission = 'editor'
    )
  );

-- DELETE: Only the document owner can delete their document
drop policy if exists "documents_delete_policy" on public.documents;
create policy "documents_delete_policy"
  on public.documents
  for delete
  using (
    owner_id = (select auth.uid())
  );

-- ==============================================================================
-- RLS POLICIES FOR: public.document_shares
-- ==============================================================================

-- SELECT: Document owners can inspect who has access, and shared users can see their own share entry
drop policy if exists "document_shares_select_policy" on public.document_shares;
create policy "document_shares_select_policy"
  on public.document_shares
  for select
  using (
    shared_with_user_id = (select auth.uid())
    or public.is_document_owner(document_id, (select auth.uid()))
  );

-- INSERT: Only the document owner can grant access to other users. Cannot share with themselves.
drop policy if exists "document_shares_insert_policy" on public.document_shares;
create policy "document_shares_insert_policy"
  on public.document_shares
  for insert
  with check (
    public.is_document_owner(document_id, (select auth.uid()))
    and shared_with_user_id <> (select auth.uid())
  );

-- UPDATE: Only the document owner can modify share permissions (e.g. viewer <-> editor)
drop policy if exists "document_shares_update_policy" on public.document_shares;
create policy "document_shares_update_policy"
  on public.document_shares
  for update
  using (
    public.is_document_owner(document_id, (select auth.uid()))
  )
  with check (
    public.is_document_owner(document_id, (select auth.uid()))
  );

-- DELETE: Only the document owner can revoke access from users
drop policy if exists "document_shares_delete_policy" on public.document_shares;
create policy "document_shares_delete_policy"
  on public.document_shares
  for delete
  using (
    public.is_document_owner(document_id, (select auth.uid()))
  );

-- ==============================================================================
-- 8. SECURE DOCUMENT SHARING RPC FUNCTIONS
-- ==============================================================================

-- SHARE DOCUMENT BY EMAIL (Owner only)
create or replace function public.share_document_by_email(
  p_document_id uuid,
  p_email text,
  p_permission text
)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller_id uuid := auth.uid();
  v_target_user_id uuid;
  v_target_email text := lower(trim(p_email));
  v_is_owner boolean;
  v_new_share_id uuid;
begin
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_permission not in ('viewer', 'editor') then
    raise exception 'Invalid permission. Must be either viewer or editor.';
  end if;

  select exists (
    select 1 from public.documents
    where id = p_document_id and owner_id = v_caller_id
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'Only the document owner can share this document.';
  end if;

  select id into v_target_user_id
  from auth.users
  where lower(email) = v_target_email;

  if v_target_user_id is null then
    raise exception 'User with email "%" was not found. Please ensure the user has created an account.', p_email;
  end if;

  if v_target_user_id = v_caller_id then
    raise exception 'You cannot share a document with yourself.';
  end if;

  insert into public.document_shares (document_id, shared_with_user_id, permission)
  values (p_document_id, v_target_user_id, p_permission)
  on conflict (document_id, shared_with_user_id)
  do update set permission = excluded.permission
  returning id into v_new_share_id;

  return json_build_object(
    'success', true,
    'share_id', v_new_share_id,
    'user_id', v_target_user_id,
    'email', v_target_email,
    'permission', p_permission
  );
end;
$$;

-- GET DOCUMENT COLLABORATORS (Owner only)
create or replace function public.get_document_collaborators(
  p_document_id uuid
)
returns table (
  share_id uuid,
  user_id uuid,
  email text,
  permission text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller_id uuid := auth.uid();
  v_is_owner boolean;
begin
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  select exists (
    select 1 from public.documents
    where id = p_document_id and owner_id = v_caller_id
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'Only the document owner can inspect collaborators.';
  end if;

  return query
  select 
    s.id as share_id,
    s.shared_with_user_id as user_id,
    u.email::text as email,
    s.permission,
    s.created_at
  from public.document_shares s
  join auth.users u on u.id = s.shared_with_user_id
  where s.document_id = p_document_id
  order by s.created_at asc;
end;
$$;

-- REVOKE DOCUMENT SHARE (Owner only)
create or replace function public.revoke_document_share(
  p_share_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_doc_id uuid;
  v_is_owner boolean;
begin
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  select document_id into v_doc_id
  from public.document_shares
  where id = p_share_id;

  if v_doc_id is null then
    raise exception 'Share record not found.';
  end if;

  select exists (
    select 1 from public.documents
    where id = v_doc_id and owner_id = v_caller_id
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'Only the document owner can revoke access.';
  end if;

  delete from public.document_shares where id = p_share_id;
  return true;
end;
$$;

-- UPDATE SHARE PERMISSION (Owner only)
create or replace function public.update_document_share_permission(
  p_share_id uuid,
  p_permission text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_doc_id uuid;
  v_is_owner boolean;
begin
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_permission not in ('viewer', 'editor') then
    raise exception 'Permission must be either viewer or editor.';
  end if;

  select document_id into v_doc_id
  from public.document_shares
  where id = p_share_id;

  if v_doc_id is null then
    raise exception 'Share record not found.';
  end if;

  select exists (
    select 1 from public.documents
    where id = v_doc_id and owner_id = v_caller_id
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'Only the document owner can modify permissions.';
  end if;

  update public.document_shares
  set permission = p_permission
  where id = p_share_id;

  return true;
end;
$$;

