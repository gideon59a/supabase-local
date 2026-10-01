-- Providers must pick their category from the admin-defined list (public.categories),
-- the same list items use, instead of typing free text. Free text let a provider
-- save a junk value (e.g. "jlkjljlkjlk") with nothing to stop it.

alter table public.providers
  add column category_id uuid references public.categories (id) on delete set null;

-- Best-effort carry over: match existing free-text values to a category by
-- name (case-insensitive). Anything that doesn't match (typos, junk, "Admin",
-- ...) is left unset - the provider picks a real category next time they save.
update public.providers p
set category_id = c.id
from public.categories c
where lower(btrim(p.category)) = lower(c.name);

alter table public.providers drop column category;

create index providers_category_idx on public.providers (category_id);

comment on column public.providers.category_id is
  'The provider''s category, chosen from public.categories. Optional; null until they pick one.';

-- Extend providers_guard to also reject an inactive/unavailable category - the
-- same rule items.category_id gets from items_validate_attributes. Only checked
-- on insert or when category_id actually changes, so e.g. editing your phone
-- number still works after an admin deactivates your existing category.
create or replace function public.providers_guard()
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

  if new.category_id is not null
     and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id)
     and not exists (select 1 from public.categories where id = new.category_id and is_active) then
    raise exception 'This category is not available' using errcode = '23514';
  end if;

  new.updated_at := now();
  return new;
end;
$$;
