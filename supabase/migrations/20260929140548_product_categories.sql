-- Product categories with admin-defined fields ("approach 3").
--
--   categories         admin-managed list of product categories
--   field_definitions  per-category fields: label, help text, type, rules, options
--   items.category_id  every item belongs to one category
--   items.attributes   the item's field values as JSON, e.g. {"level": "beginner", "online": true}
--
-- Core columns (title, price, currency, ...) stay real columns. Category-specific
-- details live in items.attributes and are validated by a trigger against the
-- category's field definitions, so bad data cannot get in even by bypassing the app.

-------------------------------------------------------------------------------
-- Categories
-------------------------------------------------------------------------------

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name        text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 1000),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,  -- inactive: cannot be chosen for items, hidden from browsing
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.categories enable row level security;

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create policy "Anyone can view categories"
  on public.categories for select to anon, authenticated
  using (true);

create policy "Admins can create categories"
  on public.categories for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update categories"
  on public.categories for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete categories"
  on public.categories for delete to authenticated
  using ((select public.is_admin()));

-------------------------------------------------------------------------------
-- Field definitions
-------------------------------------------------------------------------------

create type public.field_type as enum (
  'text', 'long_text', 'number', 'integer', 'boolean', 'select', 'multi_select', 'date', 'url'
);

create table public.field_definitions (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.categories (id) on delete cascade,
  key           text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),  -- JSON key in items.attributes; fixed once created
  label         text not null check (char_length(label) between 1 and 80),
  help_text     text check (char_length(help_text) <= 500),
  type          public.field_type not null,
  required      boolean not null default false,
  -- select / multi_select: [{"value": "beginner", "label": "Beginner"}, ...]
  options       jsonb not null default '[]' check (jsonb_typeof(options) = 'array'),
  -- number / integer: allowed value range. text / long_text: allowed length.
  min           numeric,
  max           numeric,
  unit          text check (char_length(unit) <= 20),  -- shown after the value, e.g. "min", "g"
  is_filterable boolean not null default false,        -- visitors can filter by this field
  sort_order    integer not null default 0,
  is_active     boolean not null default true,         -- inactive: hidden and not validated; stored values are kept
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (category_id, key),
  check (min is null or max is null or min <= max)
);

create index field_definitions_category_idx on public.field_definitions (category_id, sort_order);

alter table public.field_definitions enable row level security;

create policy "Anyone can view field definitions"
  on public.field_definitions for select to anon, authenticated
  using (true);

create policy "Admins can create field definitions"
  on public.field_definitions for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins can update field definitions"
  on public.field_definitions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins can delete field definitions"
  on public.field_definitions for delete to authenticated
  using ((select public.is_admin()));

-------------------------------------------------------------------------------
-- Items: category + attributes
-------------------------------------------------------------------------------

insert into public.categories (slug, name, description, sort_order, is_active)
values ('uncategorized', 'Uncategorized', 'Items created before categories existed.', 1000, false);

alter table public.items
  add column category_id uuid references public.categories (id) on delete restrict,
  add column attributes jsonb not null default '{}' check (jsonb_typeof(attributes) = 'object');

update public.items
set category_id = (select id from public.categories where slug = 'uncategorized')
where category_id is null;

alter table public.items alter column category_id set not null;

create index items_category_idx on public.items (category_id);
-- jsonb_path_ops GIN index: fast "attributes @> {...}" containment filters.
create index items_attributes_idx on public.items using gin (attributes jsonb_path_ops);

-------------------------------------------------------------------------------
-- Rules for changing field definitions safely
-------------------------------------------------------------------------------

-- Number of items (in the field's category) that have a value for the field.
create function public.field_usage_count(p_field_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from public.items i
  join public.field_definitions d on d.id = p_field_id
  where i.category_id = d.category_id and i.attributes ? d.key;
$$;

create function public.field_definitions_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  in_use bigint;
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
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger field_definitions_guard
  before insert or update or delete on public.field_definitions
  for each row execute function public.field_definitions_guard();

-------------------------------------------------------------------------------
-- Validating item attributes
-------------------------------------------------------------------------------

-- Returns a list of human-readable problems (empty = valid). Also callable
-- from the app / SQL editor: select public.validate_item_attributes(category_id, attributes)
create function public.validate_item_attributes(p_category_id uuid, p_attributes jsonb)
returns text[]
language plpgsql
stable
set search_path = ''
as $$
declare
  d public.field_definitions;
  v jsonb;
  k text;
  n numeric;
  errors text[] := '{}';
  allowed jsonb;
begin
  for d in
    select * from public.field_definitions
    where category_id = p_category_id and is_active
    order by sort_order, label
  loop
    v := p_attributes -> d.key;

    if v is null or v = 'null'::jsonb
       or (jsonb_typeof(v) = 'string' and btrim(v #>> '{}') = '')
       or (jsonb_typeof(v) = 'array' and jsonb_array_length(v) = 0) then
      if d.required and d.type <> 'boolean' then
        errors := errors || format('%s is required', d.label);
      end if;
      continue;
    end if;

    allowed := coalesce((select jsonb_agg(o -> 'value') from jsonb_array_elements(d.options) o), '[]');

    case d.type
      when 'text', 'long_text' then
        if jsonb_typeof(v) <> 'string' then
          errors := errors || format('%s must be text', d.label);
        elsif d.min is not null and char_length(v #>> '{}') < d.min then
          errors := errors || format('%s must be at least %s characters', d.label, d.min);
        elsif d.max is not null and char_length(v #>> '{}') > d.max then
          errors := errors || format('%s must be at most %s characters', d.label, d.max);
        end if;

      when 'number', 'integer' then
        if jsonb_typeof(v) <> 'number' then
          errors := errors || format('%s must be a number', d.label);
        else
          n := (v #>> '{}')::numeric;
          if d.type = 'integer' and n <> trunc(n) then
            errors := errors || format('%s must be a whole number', d.label);
          elsif d.min is not null and n < d.min then
            errors := errors || format('%s must be at least %s', d.label, d.min);
          elsif d.max is not null and n > d.max then
            errors := errors || format('%s must be at most %s', d.label, d.max);
          end if;
        end if;

      when 'boolean' then
        if jsonb_typeof(v) <> 'boolean' then
          errors := errors || format('%s must be yes or no', d.label);
        end if;

      when 'select' then
        if jsonb_typeof(v) <> 'string' or not (allowed @> jsonb_build_array(v)) then
          errors := errors || format('%s has an invalid choice', d.label);
        end if;

      when 'multi_select' then
        if jsonb_typeof(v) <> 'array' or not (allowed @> v)
           or exists (select 1 from jsonb_array_elements(v) e where jsonb_typeof(e) <> 'string') then
          errors := errors || format('%s has an invalid choice', d.label);
        end if;

      when 'date' then
        if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^\d{4}-\d{2}-\d{2}$' then
          errors := errors || format('%s must be a date (YYYY-MM-DD)', d.label);
        else
          begin
            perform (v #>> '{}')::date;
          exception when others then
            errors := errors || format('%s is not a valid date', d.label);
          end;
        end if;

      when 'url' then
        if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~* '^https?://[^\s]+$' then
          errors := errors || format('%s must be a web address starting with http:// or https://', d.label);
        end if;
    end case;
  end loop;

  -- Keys must belong to this category (values of inactive fields are allowed: they are kept).
  for k in select jsonb_object_keys(p_attributes) loop
    if not exists (select 1 from public.field_definitions where category_id = p_category_id and key = k) then
      errors := errors || format('Unknown field "%s" for this category', k);
    end if;
  end loop;

  return errors;
end;
$$;

create function public.items_validate_attributes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  errors text[];
begin
  new.attributes := jsonb_strip_nulls(coalesce(new.attributes, '{}'));

  -- Only validate when the category or attributes change, so that e.g. hiding an
  -- item or toggling "published" still works after an admin adds a required field.
  if tg_op = 'UPDATE'
     and new.category_id is not distinct from old.category_id
     and new.attributes is not distinct from old.attributes then
    return new;
  end if;

  if (tg_op = 'INSERT' or new.category_id is distinct from old.category_id)
     and not exists (select 1 from public.categories where id = new.category_id and is_active) then
    raise exception 'This category is not available' using errcode = '23514';
  end if;

  errors := public.validate_item_attributes(new.category_id, new.attributes);
  if cardinality(errors) > 0 then
    raise exception '%', array_to_string(errors, '; ') using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger items_validate_attributes
  before insert or update on public.items
  for each row execute function public.items_validate_attributes();

-------------------------------------------------------------------------------
-- Public search with dynamic filters
-------------------------------------------------------------------------------
-- p_filters keys are field keys of the category's *filterable* fields:
--   select        "level": "beginner"  or  ["beginner", "advanced"]   (any of)
--   multi_select  "allergens": ["nuts", "dairy"]                        (has all of)
--   boolean       "online": true
--   number/integer/date  "duration_minutes": {"min": 30, "max": 90}
--   text/long_text/url   "area": "haifa"                                (contains, case-insensitive)
-- Unknown or non-filterable keys are ignored.
-- SECURITY INVOKER: RLS still applies; the explicit conditions below additionally
-- keep results public-only for logged-in owners/admins.

create function public.search_items(
  p_category  text    default null,  -- category slug
  p_query     text    default null,  -- matches title or description
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_filters   jsonb   default '{}',
  p_sort      text    default 'newest',  -- newest | price_asc | price_desc
  p_limit     integer default 60,
  p_offset    integer default 0
)
returns setof public.items
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  cat public.categories;
  d public.field_definitions;
  v jsonb;
  conds text[] := array[
    'i.is_published',
    'not i.is_hidden_by_admin',
    'exists (select 1 from public.providers p where p.id = i.provider_id and p.status = ''approved'')'
  ];
  order_by text;
begin
  if p_category is not null then
    select * into cat from public.categories where slug = p_category and is_active;
    if not found then
      return;
    end if;
    conds := conds || format('i.category_id = %L', cat.id);

    for d in
      select * from public.field_definitions
      where category_id = cat.id and is_active and is_filterable
    loop
      v := coalesce(p_filters, '{}') -> d.key;
      continue when v is null or v = 'null'::jsonb;

      case
        when d.type = 'select' then
          if jsonb_typeof(v) = 'array' and jsonb_array_length(v) > 0 then
            conds := conds || format('(i.attributes -> %L) <@ %L::jsonb', d.key, v);
          elsif jsonb_typeof(v) = 'string' then
            conds := conds || format('i.attributes @> %L::jsonb', jsonb_build_object(d.key, v));
          end if;
        when d.type = 'multi_select' then
          if jsonb_typeof(v) = 'string' then v := jsonb_build_array(v); end if;
          if jsonb_typeof(v) = 'array' and jsonb_array_length(v) > 0 then
            conds := conds || format('i.attributes @> %L::jsonb', jsonb_build_object(d.key, v));
          end if;
        when d.type = 'boolean' then
          if jsonb_typeof(v) = 'boolean' then
            conds := conds || format('i.attributes @> %L::jsonb', jsonb_build_object(d.key, v));
          end if;
        when d.type in ('number', 'integer') then
          if jsonb_typeof(v -> 'min') = 'number' then
            conds := conds || format('(i.attributes ->> %L)::numeric >= %s', d.key, (v ->> 'min')::numeric);
          end if;
          if jsonb_typeof(v -> 'max') = 'number' then
            conds := conds || format('(i.attributes ->> %L)::numeric <= %s', d.key, (v ->> 'max')::numeric);
          end if;
        when d.type = 'date' then
          if coalesce(v ->> 'min', '') ~ '^\d{4}-\d{2}-\d{2}$' then
            conds := conds || format('(i.attributes ->> %L)::date >= %L::date', d.key, v ->> 'min');
          end if;
          if coalesce(v ->> 'max', '') ~ '^\d{4}-\d{2}-\d{2}$' then
            conds := conds || format('(i.attributes ->> %L)::date <= %L::date', d.key, v ->> 'max');
          end if;
        else  -- text, long_text, url
          if jsonb_typeof(v) = 'string' and btrim(v #>> '{}') <> '' then
            conds := conds || format('strpos(lower(i.attributes ->> %L), lower(%L)) > 0', d.key, v #>> '{}');
          end if;
      end case;
    end loop;
  end if;

  if coalesce(btrim(p_query), '') <> '' then
    conds := conds || format(
      '(strpos(lower(i.title), lower(%1$L)) > 0 or strpos(lower(coalesce(i.description, '''')), lower(%1$L)) > 0)',
      btrim(p_query));
  end if;
  if p_min_price is not null then conds := conds || format('i.price >= %s', p_min_price); end if;
  if p_max_price is not null then conds := conds || format('i.price <= %s', p_max_price); end if;

  order_by := case p_sort
    when 'price_asc'  then 'i.price asc nulls last, i.created_at desc'
    when 'price_desc' then 'i.price desc nulls last, i.created_at desc'
    else 'i.created_at desc'
  end;

  return query execute format(
    'select i.* from public.items i where %s order by %s limit %s offset %s',
    array_to_string(conds, ' and '), order_by,
    greatest(least(coalesce(p_limit, 60), 200), 1), greatest(coalesce(p_offset, 0), 0));
end;
$$;

-------------------------------------------------------------------------------
-- Privileges
-------------------------------------------------------------------------------

revoke all on public.categories, public.field_definitions from anon, authenticated;
grant select on public.categories, public.field_definitions to anon, authenticated;
grant insert, update, delete on public.categories, public.field_definitions to authenticated;
grant all on public.categories, public.field_definitions to service_role;

revoke execute on function public.field_usage_count(uuid) from public, anon;
grant execute on function public.field_usage_count(uuid) to authenticated, service_role;

-------------------------------------------------------------------------------
-- Example categories (edit or deactivate them in /admin/categories)
-------------------------------------------------------------------------------

with c as (
  insert into public.categories (slug, name, description, sort_order) values
    ('tutoring', 'Tutoring', 'Private lessons and courses.', 10),
    ('bakery', 'Bakery', 'Bread, cakes and pastries.', 20),
    ('home-repair', 'Home repair', 'Plumbing, electrical, carpentry and more.', 30)
  returning id, slug
)
insert into public.field_definitions
  (category_id, key, label, help_text, type, required, options, min, max, unit, is_filterable, sort_order)
select c.id, f.key, f.label, f.help_text, f.type::public.field_type, f.required, f.options::jsonb,
       f.min, f.max, f.unit, f.is_filterable, f.sort_order
from c
join (values
  ('tutoring', 'subject', 'Subject', 'The main subject you teach in this lesson.', 'select', true,
   '[{"value":"math","label":"Math"},{"value":"english","label":"English"},{"value":"science","label":"Science"},{"value":"music","label":"Music"},{"value":"other","label":"Other"}]',
   null::numeric, null::numeric, null, true, 10),
  ('tutoring', 'level', 'Level', 'Who the lesson is suitable for.', 'select', true,
   '[{"value":"beginner","label":"Beginner"},{"value":"intermediate","label":"Intermediate"},{"value":"advanced","label":"Advanced"}]',
   null, null, null, true, 20),
  ('tutoring', 'duration_minutes', 'Lesson length', 'How long one lesson lasts.', 'integer', true,
   '[]', 15, 480, 'min', true, 30),
  ('tutoring', 'online', 'Online', 'Tick if the lesson can be given online (video call).', 'boolean', false,
   '[]', null, null, null, true, 40),
  ('bakery', 'weight_grams', 'Weight', 'Net weight of one unit.', 'integer', false,
   '[]', 1, 20000, 'g', true, 10),
  ('bakery', 'allergens', 'Contains allergens', 'Tick every allergen the product contains.', 'multi_select', false,
   '[{"value":"gluten","label":"Gluten"},{"value":"nuts","label":"Nuts"},{"value":"dairy","label":"Dairy"},{"value":"eggs","label":"Eggs"},{"value":"soy","label":"Soy"}]',
   null, null, null, false, 20),
  ('bakery', 'kosher', 'Kosher', 'Tick if the product has kosher certification.', 'boolean', false,
   '[]', null, null, null, true, 30),
  ('bakery', 'shelf_life_days', 'Shelf life', 'How many days the product stays fresh.', 'integer', false,
   '[]', 1, 365, 'days', false, 40),
  ('home-repair', 'service_type', 'Service type', 'The kind of work offered.', 'select', true,
   '[{"value":"plumbing","label":"Plumbing"},{"value":"electrical","label":"Electrical"},{"value":"carpentry","label":"Carpentry"},{"value":"painting","label":"Painting"},{"value":"other","label":"Other"}]',
   null, null, null, true, 10),
  ('home-repair', 'includes_materials', 'Materials included', 'Tick if the price includes materials.', 'boolean', false,
   '[]', null, null, null, true, 20),
  ('home-repair', 'service_area', 'Service area', 'Cities or regions you cover.', 'text', false,
   '[]', null, 200, null, true, 30),
  ('home-repair', 'available_from', 'Available from', 'First date you can take this job.', 'date', false,
   '[]', null, null, null, false, 40)
) as f(cat, key, label, help_text, type, required, options, min, max, unit, is_filterable, sort_order)
  on f.cat = c.slug;
