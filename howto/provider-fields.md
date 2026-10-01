# Provider account fields

This is for **developers**. Unlike product fields (see
[categories-and-fields.md](categories-and-fields.md)), provider account fields are **not** editable by
the admin in the app - they are defined once in code, because they include sensitive data protected by
row-level security and rarely change. If you need admin-editable provider fields, see "Why code, not the
admin UI?" at the end.

## Where they live

Everything is driven by one catalog: **`web/lib/providerFields.ts`**, an array of field definitions.
Each entry has a `table` (`"providers"` for the public profile, `"provider_private"` for private
details), a `key` matching a database column, a label, help text, an input type, and optional
`required` / `minLength` / `maxLength`.

This one list drives:

| Where | File |
|---|---|
| Profile form (public fields) | `web/app/providers/(protected)/profile/page.tsx` |
| Account form (private fields) | `web/app/providers/(protected)/account/page.tsx` |
| Reading + validating form input | `saveProfile` / `savePrivateData` in `web/app/providers/(protected)/actions.ts` |
| Admin's read-only view | `web/app/admin/(protected)/providers/[providerId]/page.tsx` |
| Providers' help page | `web/app/providers/help/account/page.tsx` |

The form and admin-view components (`ProviderFieldInputs`, `ProviderFieldList` in `web/components/`) are
generic - they render whatever the catalog contains. You should not need to change them to add a field.

## Adding a field

Say you want to add "Website" to the public profile.

1. **Migration:** add the column.
   ```bash
   npx supabase migration new add_provider_website
   ```
   ```sql
   alter table public.providers add column website text check (char_length(website) <= 200);
   comment on column public.providers.website is 'Provider''s website, shown publicly.';
   ```
   ```bash
   npx supabase migration up      # keeps existing data
   npm run db:types               # regenerates web/lib/database.types.ts
   ```

2. **Catalog entry** in `web/lib/providerFields.ts`, in the `providers` group:
   ```ts
   {
     key: "website",
     table: "providers",
     label: "Website",
     help: "Your business website, shown publicly on your profile.",
     type: "url",
     maxLength: 200,
   },
   ```

That's it. The profile form gets the input and help text, `saveProfile` validates and saves it, the
admin's provider page lists it, and the help page explains it - all without touching those files.

## Field types

| `type` | HTML input | Notes |
|---|---|---|
| `text` | `<input>` | |
| `long_text` | `<textarea>` | |
| `tel` | `<input type="tel">` | |
| `email` | `<input type="email">` | |
| `url` | `<input type="url">` | |
| `date` | `<input type="date">` | Validated as `YYYY-MM-DD` |

To add a new type (e.g. `number`), extend `ProviderFieldType` and the `FieldInput` switch in
`web/components/ProviderFieldInputs.tsx`, plus a validation branch in `readProviderFields()`
(`web/lib/providerFields.ts`) if it needs more than min/max length.

## Validation

`readProviderFields()` in `web/lib/providerFields.ts` checks `required`, `minLength`, `maxLength` and
(for `date`) the format, from the catalog entry - there is no database-side validation on these columns
(unlike category fields, which are validated by a trigger). If you add a stricter rule (e.g. a regex for
phone numbers), add it there and it applies wherever the field is saved.

`providers.category_id` is the one exception: it isn't in this catalog at all (see the profile page and
`saveProfile()`), because it needs to be a dropdown of `public.categories` rather than a scalar column.
It's validated both in the app (the id must exist) and in the database (the `providers_guard` trigger
rejects an inactive category on insert or when it changes) - the same two-layer pattern items use.

## Changing a field without losing existing data

There is no guard trigger for provider fields (unlike category fields - see below), so safety comes from
**how you write the migration**, plus one real backstop: Postgres itself refuses a migration that would
violate existing data, rather than silently applying it. Verified against this project's actual data
(see "What's been tested" below): adding a nullable column left every existing row byte-for-byte
identical, and adding a `NOT NULL` constraint while a row had `NULL` in that column was rejected outright
- the column stayed exactly as it was.

| Change | Safe? |
|---|---|
| Add a new nullable column | Yes - existing rows get `NULL`, nothing else changes |
| Add a `CHECK` / `NOT NULL` constraint that all existing rows already satisfy | Yes - Postgres validates it at migration time |
| Add a `CHECK` / `NOT NULL` constraint that some existing rows violate | **The migration fails and is not applied** - backfill or relax the constraint first |
| Widen a limit (e.g. raise `maxLength` in the catalog, or a `char_length(...) <= N` check) | Yes |
| Narrow a limit | Safe for the schema (same as above: fails loudly if violated); existing values that no longer fit still display fine, they just cannot be *re-saved* until edited |
| Rename a `key` | **Not automatic.** Renaming in the catalog alone orphans the old data. Use `alter table ... rename column ...` in the migration, and change the catalog's `key` to match, in the same change |
| Move a field between `providers` and `provider_private` | **Not automatic.** Needs a migration that copies the column's data across, not just add+drop |
| Drop a column | **Destroys its data permanently.** There is no "deactivate" option like category fields have. If you might want the data back, rename it (e.g. `old_website`) instead of dropping it |

**For anything beyond adding a nullable column**, follow the full procedure in
[schema-changes.md](schema-changes.md): snapshot, dry-run in the disposable staging project against a
mirror of your real data, verify, apply, verify again. For a plain additive change, the short version is
enough:
1. `npx supabase db dump --local --data-only -f supabase/snapshots/<date>-<name>.sql` (repo root)
2. Write the migration as narrowly as possible (add, don't rewrite)
3. `npx supabase migration up` (never `db reset` - see [developer.md](developer.md))
4. If it fails, that is the safety net working - read the error, decide whether to backfill data or relax the change, not to force it through
5. `cd web && npm run verify-schema`

## Moving a field between public and private

Change `table` in the catalog entry, then a migration to move the column between `providers` and
`provider_private` (drop from one, add to the other; write a data migration if you need to keep existing
values). Row-level security is per-table, so this is also how you change who can see a field.

## Why code, not the admin UI?

Product fields are admin-editable because providers add many different kinds of products and categories
change often. Provider account fields are different: there is a small, fixed set of them, some carry
real security consequences (the `provider_private` table has its own row-level security and a two-factor
requirement - see the schema migration), and getting them wrong is riskier than for a product field. A
short, reviewed code change is safer here than a self-service admin form. If your use case genuinely
needs admin-editable provider fields, the `field_definitions` mechanism used for products
(see [categories-and-fields.md](categories-and-fields.md)) could be adapted, at the cost of that same
flexibility-vs-safety trade-off.

## What's been tested

- **The form/save/display path:** an end-to-end (real browser) test covers required fields, minimum
  length, an invalid date, saving, and the saved values reappearing correctly in the provider's own
  forms and on the admin's provider page.
- **Data safety of schema changes:** verified directly against this project's real `providers` table
  (not synthetic data): adding a nullable column left every existing row unchanged, and adding a
  `NOT NULL` constraint while a row had `NULL` was rejected by Postgres with no partial effect. This is
  what the table above is based on.

**Not yet tested:** an actual rename or drop of a field on data that depends on it (the two genuinely
destructive cases), and a full migration-plus-app-restart cycle. There is no automated test suite in the
repo (see [developer.md](developer.md) "Testing") - these were one-off verification scripts. Treat the
table above as documented practice, not a guarantee enforced by code, and always back up
(`npx supabase db dump --local --data-only -f backup.sql`) before a change that isn't purely additive.
