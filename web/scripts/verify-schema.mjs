// Schema & data consistency audit for the local Supabase database.
//
//   npm run verify:schema                 -- checks the primary project
//   npm run verify:schema -- --project=supabase-local-staging   -- checks staging
//
// Connects straight to Postgres via `docker exec ... psql` (this is a local
// developer tool, not app code, so it is allowed to depend on Docker and the
// container naming convention `supabase_db_<project_id>`).
//
// What it checks, and why:
//   1. Every table in the public schema has Row Level Security enabled.
//      A table created without `enable row level security` is invisible to
//      the app today, but a forgotten `alter table ... enable row level
//      security` on a NEW table would make it wide open instead - this
//      catches that before it ships.
//   2. Every RLS-enabled table has at least one policy. RLS enabled with
//      zero policies silently denies everyone (including admins) - usually
//      a sign a migration is unfinished, not a feature.
//   3. Every "*_id" column has a real foreign key. items.attributes stores
//      category-defined values as JSON, which Postgres cannot put a real
//      foreign key on - the item-level checks below cover that relationship
//      instead. This check is for any OTHER column that looks like a
//      reference but was never actually wired up with REFERENCES.
//   4. Every value inside items.attributes has a matching field_definitions
//      row (active or inactive) for that item's category. The
//      items_validate_attributes trigger is supposed to make this
//      impossible to violate through normal use (even via the secret key or
//      direct SQL, since triggers aren't bypassed by either) - this is the
//      "prove it" check, and would only ever find something after a bulk
//      restore with triggers disabled, or a bug in the trigger itself.
//   5. Every existing item's attributes still satisfy its category's
//      CURRENT field rules. An admin loosening a field's rules is always
//      fine; this instead reruns the same validation the database applies
//      on write against ALL existing rows, so if a future change manages to
//      let a field's rules tighten without the field_definitions_guard
//      catching it (see migration 20261001145714 for the first case this
//      caught: narrowing min/max), existing data is checked anyway, not
//      just newly-written rows.
//
// Exits non-zero if anything is found, so it can gate a migration ("apply to
// staging, run this, only then apply to primary" - see
// howto/schema-changes.md).

import { execSync } from "node:child_process";

const projectId = process.argv.find((a) => a.startsWith("--project="))?.split("=")[1] ?? "supabase-local";
const container = `supabase_db_${projectId}`;

function psqlJson(sql) {
  // Collapsed to one line: this goes through cmd.exe on Windows (Node's default
  // shell), which mishandles literal newlines inside a quoted argument.
  const oneLine = sql.replace(/\s+/g, " ").trim();
  const wrapped = `select coalesce(json_agg(t), '[]') from (${oneLine}) t;`;
  const out = execSync(
    `docker exec ${container} psql -U postgres -tA -c "${wrapped.replace(/"/g, '\\"')}"`,
    { encoding: "utf8" },
  ).trim();
  return JSON.parse(out || "[]");
}

let problems = 0;
function report(title, rows, describe) {
  if (rows.length === 0) {
    console.log(`  ok   ${title}`);
  } else {
    problems += rows.length;
    console.log(`  FAIL ${title} - ${rows.length} found:`);
    for (const r of rows) console.log(`         ${describe(r)}`);
  }
}

console.log(`Checking ${container} ...\n`);

// 1. RLS enabled on every public table.
report(
  "Row Level Security enabled on every public table",
  psqlJson(`
    select c.relname as table_name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  `),
  (r) => `table "${r.table_name}" has RLS disabled`,
);

// 2. Every RLS-enabled table has at least one policy.
report(
  "Every RLS-enabled table has at least one policy",
  psqlJson(`
    select c.relname as table_name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
  `),
  (r) => `table "${r.table_name}" has RLS enabled but no policies (= inaccessible to everyone)`,
);

// 3. Every "*_id" column (other than the primary key "id" itself) has a real foreign key.
// Restricted to uuid columns: every genuine reference in this schema is a uuid
// matching another table's uuid primary key. A text column like
// provider_private.national_id also ends in "_id" but is a document number,
// not a reference - including it would just be noise.
report(
  'Every "*_id" column has a real foreign key',
  psqlJson(`
    select c.table_name, c.column_name
    from information_schema.columns c
    where c.table_schema = 'public' and c.column_name like '%\\_id' and c.column_name <> 'id'
      and c.data_type = 'uuid'
      and not exists (
        select 1
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on kcu.constraint_name = tc.constraint_name and kcu.constraint_schema = tc.constraint_schema
        where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
          and kcu.table_name = c.table_name and kcu.column_name = c.column_name
      )
  `),
  (r) => `${r.table_name}.${r.column_name} looks like a reference but has no FOREIGN KEY constraint`,
);

// 4. Every items.attributes key has a matching field_definitions row (active or not) for that category.
report(
  "Every items.attributes key is a real field of its item's category",
  psqlJson(`
    select i.id as item_id, i.title, k as unknown_key
    from items i, jsonb_object_keys(i.attributes) k
    where not exists (
      select 1 from field_definitions d where d.category_id = i.category_id and d.key = k
    )
  `),
  (r) => `item "${r.title}" (${r.item_id}) has attribute "${r.unknown_key}" with no matching field definition`,
);

// 5. Every item still satisfies its category's CURRENT field rules.
report(
  "Every item's attributes still satisfy its category's current rules",
  psqlJson(`
    select id as item_id, title, errs
    from (
      select id, title, validate_item_attributes(category_id, attributes) as errs from items
    ) v
    where cardinality(errs) > 0
  `),
  (r) => `item "${r.title}" (${r.item_id}): ${r.errs.join("; ")}`,
);

console.log(`\n${problems === 0 ? "All checks passed." : `${problems} issue(s) found.`}`);
process.exit(problems === 0 ? 0 : 1);
