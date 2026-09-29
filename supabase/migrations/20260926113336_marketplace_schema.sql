-- Provider marketplace: admins, providers (public + private data), items, item images.
--
-- Security model (enforced by Postgres Row Level Security, not by the web app):
--   * anon visitors  : see approved providers and their published, non-hidden items
--   * providers      : manage only their own profile, private data, items and images
--   * admins         : see everything, approve/deny/suspend providers, hide items
--   * service_role   : bypasses RLS (used server-side only, e.g. to delete auth users)

-------------------------------------------------------------------------------
-- Admins
-------------------------------------------------------------------------------

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- SECURITY DEFINER so policies on other tables can call it without the caller
-- needing access to the admins table (and without recursive RLS checks).
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

-- A user may check whether they themselves are an admin. Rows are added only
-- by SQL / the service role (see web/scripts/create-admin.mjs).
create policy "Users can see their own admin row"
  on public.admins for select to authenticated
  using (user_id = (select auth.uid()));

-------------------------------------------------------------------------------
-- Shared helpers
-------------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when the current session satisfies the user's MFA requirement:
-- users without a verified factor pass with aal1, users with one need aal2.
create function public.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = (select auth.uid()) and f.status = 'verified'
      );
$$;

-------------------------------------------------------------------------------
-- Providers (public profile)
-------------------------------------------------------------------------------

create type public.provider_status as enum ('pending', 'approved', 'denied', 'suspended');

create table public.providers (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 100),
  category     text check (char_length(category) <= 60),
  description  text check (char_length(description) <= 2000),
  city         text check (char_length(city) <= 100),
  phone_public text check (char_length(phone_public) <= 30),
  status       public.provider_status not null default 'pending',
  status_note  text check (char_length(status_note) <= 500),  -- admin's reason, shown to the provider
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.providers enable row level security;

-- Providers may not approve themselves: only admins (or the service role) can
-- set status / status_note. New rows from normal users always start 'pending'.
create function public.providers_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.status_note := null;
    elsif new.status is distinct from old.status
       or new.status_note is distinct from old.status_note then
      raise exception 'Only an admin can change a provider''s status'
        using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger providers_guard
  before insert or update on public.providers
  for each row execute function public.providers_guard();

create policy "Anyone can view approved providers"
  on public.providers for select to anon, authenticated
  using (status = 'approved');

create policy "Providers can view their own profile"
  on public.providers for select to authenticated
  using (id = (select auth.uid()));

create policy "Providers can create their own profile"
  on public.providers for insert to authenticated
  with check (id = (select auth.uid()));

create policy "Providers can update their own profile"
  on public.providers for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Admins can view all providers"
  on public.providers for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can update any provider"
  on public.providers for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete providers"
  on public.providers for delete to authenticated
  using ((select public.is_admin()));

-------------------------------------------------------------------------------
-- Provider private data (never public)
-------------------------------------------------------------------------------

create table public.provider_private (
  provider_id     uuid primary key references public.providers (id) on delete cascade,
  full_legal_name text check (char_length(full_legal_name) <= 200),
  date_of_birth   date,
  national_id     text check (char_length(national_id) <= 50),
  phone_private   text check (char_length(phone_private) <= 30),
  address         text check (char_length(address) <= 500),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.provider_private enable row level security;

create trigger provider_private_updated_at
  before update on public.provider_private
  for each row execute function public.set_updated_at();

create policy "Providers can view their own private data"
  on public.provider_private for select to authenticated
  using (provider_id = (select auth.uid()));

create policy "Providers can create their own private data"
  on public.provider_private for insert to authenticated
  with check (provider_id = (select auth.uid()));

create policy "Providers can update their own private data"
  on public.provider_private for update to authenticated
  using (provider_id = (select auth.uid()))
  with check (provider_id = (select auth.uid()));

create policy "Admins can view all private data"
  on public.provider_private for select to authenticated
  using ((select public.is_admin()));

-- RESTRICTIVE: AND-ed with the permissive policies above. If the user has
-- enrolled two-factor auth, their session must be aal2 to touch this table.
create policy "Two-factor required when enrolled"
  on public.provider_private as restrictive for all to authenticated
  using ((select public.mfa_satisfied()))
  with check ((select public.mfa_satisfied()));

-------------------------------------------------------------------------------
-- Items (things a provider publishes / sells)
-------------------------------------------------------------------------------

create table public.items (
  id                 uuid primary key default gen_random_uuid(),
  provider_id        uuid not null default auth.uid() references public.providers (id) on delete cascade,
  title              text not null check (char_length(title) between 2 and 120),
  description        text check (char_length(description) <= 4000),
  price              numeric(12, 2) check (price >= 0),
  currency           text not null default 'USD' check (char_length(currency) = 3),
  image_path         text,  -- object path inside the 'item-images' storage bucket
  is_published       boolean not null default false,
  is_hidden_by_admin boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index items_provider_id_idx on public.items (provider_id);

alter table public.items enable row level security;

-- Only admins can hide/unhide an item.
create function public.items_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_hidden_by_admin := false;
    elsif new.is_hidden_by_admin is distinct from old.is_hidden_by_admin then
      raise exception 'Only an admin can hide or unhide an item'
        using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger items_guard
  before insert or update on public.items
  for each row execute function public.items_guard();

create policy "Anyone can view published items of approved providers"
  on public.items for select to anon, authenticated
  using (
    is_published
    and not is_hidden_by_admin
    and exists (
      select 1 from public.providers p
      where p.id = items.provider_id and p.status = 'approved'
    )
  );

create policy "Providers can view their own items"
  on public.items for select to authenticated
  using (provider_id = (select auth.uid()));

create policy "Providers can create items once they have a profile"
  on public.items for insert to authenticated
  with check (
    provider_id = (select auth.uid())
    and exists (select 1 from public.providers p where p.id = (select auth.uid()))
  );

create policy "Providers can update their own items"
  on public.items for update to authenticated
  using (provider_id = (select auth.uid()))
  with check (provider_id = (select auth.uid()));

create policy "Providers can delete their own items"
  on public.items for delete to authenticated
  using (provider_id = (select auth.uid()));

create policy "Admins can view all items"
  on public.items for select to authenticated
  using ((select public.is_admin()));

create policy "Admins can update any item"
  on public.items for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete any item"
  on public.items for delete to authenticated
  using ((select public.is_admin()));

-------------------------------------------------------------------------------
-- Table privileges (RLS decides rows; GRANTs decide which roles may try at all)
-------------------------------------------------------------------------------

revoke all on public.admins, public.providers, public.provider_private, public.items
  from anon, authenticated;

grant select on public.providers, public.items to anon;
grant select on public.admins to authenticated;
grant select, insert, update, delete
  on public.providers, public.provider_private, public.items to authenticated;
grant all
  on public.admins, public.providers, public.provider_private, public.items to service_role;

-------------------------------------------------------------------------------
-- Storage: item images
-------------------------------------------------------------------------------
-- Public bucket: anyone with the URL can view an image. Each provider writes
-- only inside a folder named after their user id: '<user id>/<file name>'.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images', 'item-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

create policy "Providers can list their own item images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'item-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

create policy "Providers can upload item images to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Providers can replace their own item images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Providers and admins can delete item images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
