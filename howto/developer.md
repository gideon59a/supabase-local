# Developer guide

## Prerequisites

- Docker Desktop (running)
- Node.js 20.9+
- Supabase CLI via `npx supabase ...` (no install needed)

## First-time setup

```bash
# repo root
npx supabase start                 # starts the local stack in Docker (first run downloads images)
npx supabase db reset              # creates the schema from supabase/migrations (EMPTY database only - see below)

cd web
npm install
cp .env.example .env.local         # fill in the keys printed by `npx supabase status`
npm run create-admin -- you@example.com "a-strong-password"
npm run dev                        # http://localhost:3000
```

Always open the app as **http://localhost:3000**, not `127.0.0.1:3000`: login cookies belong to a host
name, and auth redirects are configured for `localhost`.

## Daily use

| Task | Command (where) |
|---|---|
| Start / stop the backend | `npx supabase start` / `npx supabase stop` (repo root; data is kept) |
| Show URLs and keys | `npx supabase status` (repo root) |
| Run the app | `npm run dev` (`web/`) - keep the terminal open |
| Type-check / lint / build | `npx tsc --noEmit` / `npm run lint` / `npm run build` (`web/`) |

## Changing the database

All schema changes are **migrations** in `supabase/migrations/` - never change tables by hand in Studio
(the change would be lost and never reach other environments).

```bash
npx supabase migration new <name>      # creates an empty timestamped .sql file - write your SQL in it
npx supabase migration up              # applies new migrations to the running local DB, keeps data
cd web && npm run db:types             # regenerates web/lib/database.types.ts
```

> **`npx supabase db reset` deletes all data** (users, providers, items) and rebuilds the database from
> the migrations. Use it only when you want a clean slate. To keep data, use `migration up`.

Config changes in `supabase/config.toml` (auth settings, email, two-factor) need
`npx supabase stop` + `npx supabase start`.

**Before a risky migration** (anything beyond adding a nullable column), follow
[schema-changes.md](schema-changes.md): snapshot the data, dry-run it against a mirror of your real data
in the disposable `supabase-staging/` project, verify with `npm run verify-schema`, and only then apply
to primary. `web/scripts/verify-schema.mjs` is also worth running after any schema change, risky or not -
it's quick and catches a forgotten RLS policy or a stale row a migration's trigger didn't anticipate.

## Where things live

| What | Where |
|---|---|
| Tables, RLS policies, triggers, functions, storage bucket | `supabase/migrations/*.sql` |
| Auth settings (email confirmation, TOTP, redirect URLs) | `supabase/config.toml` |
| Supabase clients (server / browser / secret-key admin) | `web/lib/supabase/` |
| Page guards `requireProvider()` / `requireAdmin()` | `web/lib/auth.ts` |
| Category field logic (form ↔ JSON, filters, display) | `web/lib/fields.ts` |
| Provider account field catalog | `web/lib/providerFields.ts` |
| Pages and Server Actions (`actions.ts`) | `web/app/` |
| Generated DB types (do not edit) | `web/lib/database.types.ts` |

## Security model

Access rules are enforced **in the database** (Row Level Security + triggers), not in the app. The app
uses the **publishable key** everywhere, so every query runs as the logged-in user and RLS applies.
The **secret key** (bypasses RLS) is used only in `web/lib/supabase/admin.ts` - for deleting auth users
and reading emails - always after `requireAdmin()`.

When adding a table: enable RLS, add policies, and grant privileges explicitly (see the existing
migrations for the pattern). A table without policies is invisible to the app.

## Categories and fields (developer view)

See [categories-and-fields.md](categories-and-fields.md) for the concepts. Code touch points:

- Validation: `public.validate_item_attributes()` (trigger `items_validate_attributes`) - the single
  source of truth. The app shows its error messages as-is.
- Safe-change rules: trigger `field_definitions_guard`.
- Search and filters: `public.search_items()` (called with `supabase.rpc("search_items", ...)`).

**Adding a new field type** (e.g. `email`) touches:
1. a migration: `alter type public.field_type add value 'email';` and new branches in
   `validate_item_attributes()` and `search_items()`
2. `web/lib/fields.ts`: `FIELD_TYPES`, `readAttributes`, `formatAttribute`, `readFilters`
3. `web/components/AttributeInputs.tsx` and `web/components/FilterForm.tsx`
4. `npm run db:types`

## Provider account fields (developer view)

Unlike category fields, these are **not** admin-editable - they are a fixed catalog in
`web/lib/providerFields.ts` that drives the profile/account forms, their validation, the admin's
provider detail page and the providers' help page. See [provider-fields.md](provider-fields.md) for how
to add or change one, and why this one is code-only rather than admin-editable.

## Testing

There is no test runner yet. Changes were verified with throwaway Node scripts that:
- call the Supabase API as anon / provider / admin users to check RLS and validation;
- drive a real browser (puppeteer-core + the installed Chrome) against `npm run dev`.

Test scripts must create their own users/data and delete them afterwards (they run against your local
database). Use `svc.auth.admin.createUser({ email_confirm: true })` with the secret key.

## Gotchas learned the hard way

- `getClaims()` checks the JWT locally - a deleted user's token keeps working until it expires. Page
  guards use `getUser()`.
- `supabase.auth.signOut()` defaults to **global** (all devices). Use `signOut({ scope: "local" })`.
- A logged-in owner/admin sees more rows than a visitor (their own policies). Public pages filter
  explicitly (`status = 'approved'`, `is_published`), and `search_items()` does too.
- Next.js 16: `middleware` is now `proxy.ts`; `params`/`searchParams`/`cookies()` are async.
- On Windows, killing the shell that started `next dev` can leave the Node server running on port
  3000. Check with `netstat -ano | findstr :3000` and `taskkill /PID <pid> /T /F`.
- GitHub push protection rejects commits containing the `sb_secret_...` key (even the local default).
  Keep keys in `web/.env.local` (git-ignored).
- "A tree hydrated but some attributes..." warnings mentioning `data-lt-installed` come from the
  LanguageTool browser extension, not the app.
