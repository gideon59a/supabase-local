-- Closes a gap in field_definitions_guard: narrowing a field's min/max (the
-- allowed number range, or text length) was not checked against items that
-- already store a value outside the new range. Such an item kept working
-- until the provider next touched that field, when it would fail with a
-- confusing error about a limit they never saw change.
--
-- This makes range changes follow the same rule already applied to type
-- changes and removed options: blocked while it would invalidate existing
-- data, same errcode (23514), so the admin UI shows it the same way.

create or replace function public.field_definitions_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  in_use bigint;
  violating bigint;
  removed text;
  opt jsonb;
begin
  if tg_op = 'DELETE' then
    if public.field_usage_count(old.id) > 0 then
      raise exception 'Field "%" is used by items; deactivate it instead of deleting it', old.label
        using errcode = '23503';
    end if;
    return old;
  end if;

  -- Options must be [{"value": "...", "label": "..."}] with unique values.
  if new.type in ('select', 'multi_select') then
    if jsonb_array_length(new.options) = 0 then
      raise exception 'Field "%" needs at least one option', new.label using errcode = '23514';
    end if;
    for opt in select * from jsonb_array_elements(new.options) loop
      if jsonb_typeof(opt -> 'value') <> 'string' or coalesce(opt ->> 'value', '') = ''
         or jsonb_typeof(opt -> 'label') <> 'string' or coalesce(opt ->> 'label', '') = '' then
        raise exception 'Each option of "%" needs a value and a label', new.label using errcode = '23514';
      end if;
    end loop;
    if (select count(distinct o ->> 'value') from jsonb_array_elements(new.options) o)
       <> jsonb_array_length(new.options) then
      raise exception 'Options of "%" must have unique values', new.label using errcode = '23514';
    end if;
  else
    new.options := '[]';
  end if;

  if tg_op = 'UPDATE' then
    if new.key is distinct from old.key then
      raise exception 'The key of a field cannot be changed (create a new field instead)' using errcode = '23514';
    end if;
    if new.category_id is distinct from old.category_id then
      raise exception 'A field cannot move to another category' using errcode = '23514';
    end if;

    in_use := public.field_usage_count(old.id);

    if new.type is distinct from old.type and in_use > 0 then
      raise exception 'Field "%" is used by % item(s); its type cannot change. Deactivate it and add a new field.',
        old.label, in_use using errcode = '23514';
    end if;

    -- An option may only be removed if no item uses it.
    if old.type in ('select', 'multi_select') and in_use > 0 then
      for removed in
        select o ->> 'value' from jsonb_array_elements(old.options) o
        except
        select o ->> 'value' from jsonb_array_elements(new.options) o
      loop
        if exists (
          select 1 from public.items i
          where i.category_id = old.category_id
            and (i.attributes -> old.key = to_jsonb(removed) or i.attributes -> old.key ? removed)
        ) then
          raise exception 'Option "%" of "%" is used by items and cannot be removed', removed, old.label
            using errcode = '23514';
        end if;
      end loop;
    end if;

    -- A narrower min/max must not strand an existing value outside the new
    -- range. Widening is always safe (it can only accept more values), so
    -- this only ever blocks a genuine tightening.
    if in_use > 0
       and (new.min is distinct from old.min or new.max is distinct from old.max)
       and old.type in ('text', 'long_text', 'number', 'integer') then
      if old.type in ('number', 'integer') then
        select count(*) into violating
        from public.items i
        where i.category_id = old.category_id
          and i.attributes ? old.key
          and (
            (new.min is not null and (i.attributes ->> old.key)::numeric < new.min)
            or (new.max is not null and (i.attributes ->> old.key)::numeric > new.max)
          );
      else
        select count(*) into violating
        from public.items i
        where i.category_id = old.category_id
          and i.attributes ? old.key
          and (
            (new.min is not null and char_length(i.attributes ->> old.key) < new.min)
            or (new.max is not null and char_length(i.attributes ->> old.key) > new.max)
          );
      end if;

      if violating > 0 then
        raise exception 'Changing the range of "%" would invalidate % existing item(s); widen the limits instead, or fix those items first',
          old.label, violating using errcode = '23514';
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
