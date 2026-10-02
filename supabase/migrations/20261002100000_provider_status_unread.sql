-- Lets the provider dashboard show an "unread" notice when a DIFFERENT admin
-- has reviewed (approved/denied/suspended/left a note on) their profile since
-- they last looked. No cron, webhook or edge function - just two timestamps,
-- compared on page load, one of them set by providers_guard and the other by
-- the dashboard page itself when the provider actually sees it.

alter table public.providers
  add column status_changed_at timestamptz,
  add column status_seen_at timestamptz;

comment on column public.providers.status_changed_at is
  'When a DIFFERENT admin last changed status or status_note (a real review). Null if never reviewed.';
comment on column public.providers.status_seen_at is
  'When the provider last viewed their dashboard. Compared to status_changed_at for the "unread" notice.';

create or replace function public.providers_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if not public.is_admin() or new.id = (select auth.uid()) then
      if tg_op = 'INSERT' then
        new.status := 'pending';
        new.status_note := null;
      elsif new.status is distinct from old.status
         or new.status_note is distinct from old.status_note then
        raise exception 'Only another admin can change a provider''s status'
          using errcode = '42501';
      end if;
    elsif tg_op = 'UPDATE'
       and (new.status is distinct from old.status or new.status_note is distinct from old.status_note) then
      -- A different admin reviewing this provider: record when, so the
      -- provider's dashboard can show an "unread" notice until they look.
      new.status_changed_at := now();
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
