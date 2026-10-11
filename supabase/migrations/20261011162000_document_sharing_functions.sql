-- ==============================================================================
-- DocSpace: Secure Document Sharing Functions
-- Allows document owners to safely resolve emails, grant/revoke access,
-- and manage collaborators without exposing the auth.users directory.
-- ==============================================================================

-- 1. SHARE DOCUMENT BY EMAIL
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
  -- Ensure caller is authenticated
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  -- Validate permission
  if p_permission not in ('viewer', 'editor') then
    raise exception 'Invalid permission. Must be either viewer or editor.';
  end if;

  -- Verify caller is the document owner
  select exists (
    select 1 from public.documents
    where id = p_document_id and owner_id = v_caller_id
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'Only the document owner can share this document.';
  end if;

  -- Lookup target user by email in auth.users
  select id into v_target_user_id
  from auth.users
  where lower(email) = v_target_email;

  if v_target_user_id is null then
    raise exception 'User with email "%" was not found. Please ensure the user has created an account.', p_email;
  end if;

  -- Prevent owner from sharing with themselves
  if v_target_user_id = v_caller_id then
    raise exception 'You cannot share a document with yourself (you are already the owner).';
  end if;

  -- Insert or update share entry
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

-- 2. GET DOCUMENT COLLABORATORS (Owner only)
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

  -- Verify caller is the document owner
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

-- 3. REVOKE DOCUMENT SHARE (Owner only)
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

  -- Find document for this share
  select document_id into v_doc_id
  from public.document_shares
  where id = p_share_id;

  if v_doc_id is null then
    raise exception 'Share record not found.';
  end if;

  -- Verify caller is the document owner
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

-- 4. UPDATE SHARE PERMISSION (Owner only)
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
