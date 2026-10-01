# Changing the database schema safely

This is for **developers**, and applies to schema changes: a new migration touching tables, columns,
triggers or functions. It does **not** apply to an admin adding a category or a product field through
`/admin/categories` - those are plain data changes, already protected instantly by the
`field_definitions_guard` trigger (see [categories-and-fields.md](categories-and-fields.md)), with no
migration and no procedure needed.

It applies to: provider account fields (see [provider-fields.md](provider-fields.md)), and any structural
change to the categories/fields system itself (a new field type, a new table).

## What this protects against, and what it doesn't

- **Postgres itself is the main safety net.** A migration that would make a `NOT NULL` or `CHECK`
  constraint false for an existing row is **rejected outright** - the migration fails, nothing is
  half-applied. This is verified further down, against this project's real data.
- **There is no "down migration".** The Supabase CLI only runs migrations forward. Rolling back means
  replaying migrations up to the previous one and restoring a data snapshot taken before the change -
  not undoing it in place.
- **Prefer additive changes.** Add a column, backfill it, switch the app over, and only remove the old
  one in a later migration (the "expand/contract" pattern). At every step the old structure still works,
  so most problems are fixed by rolling back the *app*, not the database.
- **A snapshot-and-restore rollback loses anything written after the migration.** That's accepted here:
  this is a small, low-traffic project, and simplicity wins over a zero-loss rollback mechanism.

## The procedure

### 1. Snapshot primary (the rollback point)

```bash
# repo root
npx supabase db dump --local --data-only -f supabase/snapshots/<date>-<name>.sql
```

**Never commit this file.** It's a full data dump: real email addresses, password hashes and session
tokens, in plain text. `supabase/snapshots/` is git-ignored for exactly this reason - this repo is public.
Keep snapshots locally only, and delete old ones once you're confident you won't need to roll back to them.

### 2. Write the migration

```bash
npx supabase migration new <name>
```

Prefer additive SQL. If a change is genuinely destructive (rename, drop, a tightened constraint), say so
in a comment at the top of the file - this project doesn't have an automated linter for this yet (see
"Not built yet" below), so a clear comment is the current substitute.

### 3. Dry run against a mirror of your real data, in staging

**Staging** is a second, separate local Supabase project living in `supabase-staging/`, on different
ports, used purely as a disposable copy. It shares `supabase/migrations/` with primary by being
**synced**, not forked - there is one source of truth for migrations.

```bash
# repo root
rm -rf supabase-staging/supabase/migrations
cp -r supabase/migrations supabase-staging/supabase/migrations
cd supabase-staging && npx supabase start   # first time; `npx supabase db reset` on later runs
```

This applies every migration, including your new one, to an **empty** staging database. To actually test
it, mirror your real data into it:

```bash
# Clear the example rows the schema migration seeds (categories/field_definitions) - they already
# exist in staging with fresh IDs, and the dump below also contains them with primary's IDs, so
# restoring as-is would hit duplicate-key errors on those two tables only.
docker exec supabase_db_supabase-local-staging psql -U postgres -c "delete from field_definitions; delete from categories;"

# Restore primary's real data into staging (repo root)
docker exec -i supabase_db_supabase-local-staging psql -U postgres -d postgres < supabase/snapshots/<your-snapshot>.sql
```

You'll see one more harmless conflict - `buckets_pkey` for `item-images` - since that bucket is also
created by the migration and already exists identically in staging. That one is fine to ignore.

Staging now has the new schema **and** a real copy of your data. If the migration would have broken any
existing row, the restore itself fails right here, loudly, before anything touches primary - this is the
actual value of this step, not a formality.

### 4. Verify, in staging

```bash
cd web
npm run verify-schema -- --project=supabase-local-staging
```

This checks: RLS is enabled everywhere, every RLS-enabled table has a policy, every `uuid` `*_id`-shaped
column has a real foreign key, every `items.attributes` key matches a real field definition, and every
item's attributes still satisfy its category's *current* rules. See the comments at the top of
`web/scripts/verify-schema.mjs` for why each check exists. Also re-run the app's own test scripts against
staging's ports if the change touches application logic, not just the schema.

### 5. Apply to primary

Only after step 4 is clean:

```bash
# repo root
npx supabase migration up
```

This replays only the new migration - existing data in primary is untouched, exactly as it was in the
staging dry run.

### 6. Verify primary too

```bash
cd web && npm run verify-schema
```

### 7. Roll back, if needed

```bash
# repo root - remove (or git-revert) the bad migration file, then:
npx supabase db reset              # rebuilds from the remaining migrations only
docker exec -i supabase_db_supabase-local psql -U postgres -d postgres < supabase/snapshots/<pre-change-snapshot>.sql
```

Anything written between step 5 and the rollback is lost - the snapshot is from *before* the migration,
not from just before the rollback.

## What this was actually tested against

This procedure, and the `verify-schema.mjs` checks, were run for real - not just written - against the
first schema change that needed them: migration `20261001145714_field_range_consistency_guard.sql`,
which closes a real gap (narrowing a field's min/max used to silently strand existing items outside the
new range; it's now blocked by `field_definitions_guard`, the same way changing a field's type or
removing a used option already was).

- Primary's actual data (your real providers and item, not synthetic fixtures) was dumped, restored into
  staging on the new schema, and came back byte-for-byte identical.
- Each `verify-schema.mjs` check was deliberately triggered once (RLS disabled, an RLS-enabled table with
  no policy, data mutated with triggers bypassed the way a careless bulk restore could) and confirmed it
  actually fails, then confirmed it goes quiet again once fixed - not just that it passes on already-clean
  data.
- The new guard itself was exercised through the real admin UI in a browser: lowering a field's max
  below an in-use value is rejected with a clear message (and the admin now sees the field's current
  value range before attempting it, to avoid finding this out by trial and error); lowering it to exactly
  the boundary, and widening it, both still work.
- All of the above ran against a live mirror of this project's real data, then primary was updated the
  same way the procedure describes, and the full existing test suite (40 checks covering RLS, validation
  and the safe-change rules) was re-run against it afterward.

## Not built yet

- **A migration linter.** Nothing currently scans a new `.sql` file for destructive keywords (`DROP
  COLUMN`, `ALTER ... TYPE`, `RENAME`) and demands acknowledgment before it can be applied - step 2 relies
  on a comment and discipline, not a script.
- **Automation of steps 1-6 as one command.** Each step above is a command you run by hand. Worth wrapping
  into a single script once this has been done manually a few times and the shape feels settled.
- **Rollback for a genuine rename or drop.** The snapshot-and-replay rollback above assumes the *previous*
  set of migrations can still build a working schema. A migration that renames or drops something and is
  later found to be wrong is recovered via the data snapshot plus removing that migration file - there is
  no tooling that makes this one-command simple yet.
