-- An admin must not be able to approve/deny/suspend their OWN provider
-- profile - an admin acting on their own row gets the same self-governance
-- restriction a non-admin already has (status forced to 'pending' on insert,
-- status changes blocked). Only a DIFFERENT admin reviewing someone else's
-- profile may set status. Enforced here (not just in the app) so it holds
-- even via direct SQL or the secret key... except the secret key runs as
-- postgres/service_role, outside 'anon'/'authenticated', so this only covers
-- normal sessions - which is the actual attack surface (an admin's own login).

create or replace function public.providers_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
     and (not public.is_admin() or new.id = (select auth.uid())) then
    if tg_op = 'INSERT' then
      new.status := 'pending';
      new.status_note := null;
    elsif new.status is distinct from old.status
       or new.status_note is distinct from old.status_note then
      raise exception 'Only another admin can change a provider''s status'
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
