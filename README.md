# supabase-local

A learning project for exploring **Supabase** and its main components, so the knowledge can later be applied (by Claude Code) in real projects.
The example used is a providers portal with categoried items while considering several real life aspects detailed in the howto md files.

## Approach

This project uses a **local Supabase stack** (via the Supabase CLI and Docker) rather than the hosted cloud service at supabase.com. Running locally means no account, no costs, and the freedom to reset and experiment.

## Components to explore

- **Postgres database** – tables, SQL, migrations
- **Auth** – sign-up / sign-in, users, sessions
- **Row Level Security (RLS)** – access policies
- **Auto-generated APIs** – REST (PostgREST) and GraphQL
- **Realtime** – subscribing to database changes
- **Storage** – file buckets and access rules
- **Edge Functions** – server-side TypeScript (Deno)  - Currently not used in this project
- **Studio** – the local web dashboard

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

## Basic commands

```bash
supabase init      # create the supabase/ config folder
supabase start     # start the local stack (prints URLs and keys)
supabase status    # show running services, URLs and keys
supabase stop      # stop the local stack
```


### Example output

```text
supabase-local> npx supabase start
---
Started supabase local development setup.

╭──────────────────────────────────────╮
│ 🔧 Development Tools                 │
├─────────┬────────────────────────────┤
│ Studio  │ http://127.0.0.1:54323     │
│ Mailpit │ http://127.0.0.1:54324     │
│ MCP     │ http://127.0.0.1:54321/mcp │
╰─────────┴────────────────────────────╯

╭──────────────────────────────────────────────────────╮
│ 🌐 APIs                                              │
├────────────────┬─────────────────────────────────────┤
│ Project URL    │ http://127.0.0.1:54321              │
│ REST           │ http://127.0.0.1:54321/rest/v1      │
│ GraphQL        │ http://127.0.0.1:54321/graphql/v1   │
│ Edge Functions │ http://127.0.0.1:54321/functions/v1 │
╰────────────────┴─────────────────────────────────────╯

╭───────────────────────────────────────────────────────────────╮
│ ⛁ Database                                                    │
├─────┬─────────────────────────────────────────────────────────┤
│ URL │ postgresql://postgres:postgres@127.0.0.1:54322/postgres │
╰─────┴─────────────────────────────────────────────────────────╯

╭──────────────────────────────────────────────────────────────╮
│ 🔑 Authentication Keys                                       │
├─────────────┬────────────────────────────────────────────────┤
│ Publishable │ sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH │
│ Secret      │ sb_secret_<from npx supabase status>          │
╰─────────────┴────────────────────────────────────────────────╯

╭───────────────────────────────────────────────────────────────────────────────╮
│ 📦 Storage (S3)                                                               │
├────────────┬──────────────────────────────────────────────────────────────────┤
│ URL        │ http://127.0.0.1:54321/storage/v1/s3                             │
│ Access Key │ <from npx supabase status>                                     │
│ Secret Key │ <from npx supabase status>                                       │
│ Region     │ local                                                            │
╰────────────┴──────────────────────────────────────────────────────────────────╯

Local dev security notice
  All services bind to 0.0.0.0 (network-accessible, not just localhost)
  API keys and JWT secrets are shared defaults. Do not use in production
```

## Demo app: Provider Marketplace

> **Instructions for people using or developing the app are in [howto/](howto/README.md)**: developer, admin, provider guides and the categories & fields rules.

A Next.js app (`web/`) on top of the local Supabase stack (`supabase/`).

### Run it

```bash
npx supabase start                  # in the repo root (Docker must be running)
npx supabase db reset               # first time / after changing migrations: rebuild the DB
cd web
npm install                         # first time
cp .env.example .env.local          # first time - fill in keys from `npx supabase status`
npm run create-admin -- you@example.com "a-strong-password"   # first time, after each db reset
npm run dev                         # http://localhost:3000
```

Use `http://localhost:3000` (not `127.0.0.1:3000`) - login cookies are per host name.
**Email confirmation is off** (`enable_confirmations = false` in `supabase/config.toml`): sign-up logs the provider in immediately. Local Supabase never sends real email; when confirmation is on, emails are caught by **Mailpit** (http://127.0.0.1:54324), a developer-only stand-in for the user's inbox. To send real emails, configure `[auth.email.smtp]`.

### Studio (:54323) vs the app (:3000)

| | http://127.0.0.1:54323 | http://localhost:3000 |
|---|---|---|
| What | **Supabase Studio** - Supabase's own admin dashboard | **Your app** - the Next.js site in `web/` |
| Runs in | Docker (`npx supabase start`) | Your terminal (`npm run dev`) |
| For | The developer: browse tables, run SQL, see Auth users, Storage files, logs | End users: visitors, providers, and the site admin |
| RLS | Bypassed - full access to everything | Enforced - each user sees only what the policies allow |

Both use the same database: a provider approved at `/admin` in the app shows as `approved` in Studio's table editor.

### URL sections

In Next.js each folder under `web/app/` becomes a URL path, so the prefixes just group pages by audience (they mean nothing to Supabase):

- `/`, `/p/...`, `/items/...`, `/c/...` - public pages for visitors
- `/providers/...` - provider sign-up, login, profile, account and items (`web/app/providers/`)
- `/admin/...` - the site admin area (`web/app/admin/`)

### Routes

| Who | Route | Purpose |
|---|---|---|
| Public | `/` | Search, latest items, a chip per category |
| | `/p/[providerId]` | A provider's public page |
| | `/items/[itemId]` | Item details |
| | `/c/[slug]` | One category with a filter sidebar built from its filterable fields |
| Provider | `/providers` | Landing: join / log in |
| | `/providers/signup`, `/providers/login` | Account creation and login |
| | `/providers/dashboard` | Approval status, admin note, unread-review notice |
| | `/providers/profile` | Public profile (create / edit) |
| | `/providers/account` | Private details, change password, two-factor (authenticator app) |
| | `/providers/items`, `.../new?category=`, `.../[itemId]/edit` | Manage items: pick a category, fill its fields, image upload |
| | `/providers/help/fields` | Every category and its product fields explained (generated from the definitions) |
| | `/providers/help/account` | Every profile / private-details field explained (generated from the catalog) |
| Admin | `/admin/login` | Admin login (non-admins are refused) |
| | `/admin` | Counts per status |
| | `/admin/providers[?status=]` | Provider list |
| | `/admin/providers/[providerId]` | Full details incl. private data; approve / deny / suspend / delete; hide / delete items |
| | `/admin/items[?provider=][&category=]` | All items, filterable by provider/category; hide / delete |
| | `/admin/categories`, `.../[categoryId]`, `.../fields/[fieldId]` | Categories and their fields: add, edit, reorder, deactivate, preview |
| Shared | `/auth/callback`, `/auth/mfa`, `/auth/signout` | Email-link login, two-factor step, sign out |

### Supabase features used

- **Migrations** - the whole schema is in [`supabase/migrations/`](supabase/migrations/)
- **Row Level Security** - all access rules live in the database, not the app:
  - visitors see only approved providers and published, non-hidden items
  - providers read/write only their own rows; no self-approval - neither a provider nor an admin acting on their own provider profile can change its status (trigger), only a *different* admin reviewing someone else can
  - `provider_private` is visible only to its owner and admins, and needs **aal2** (two-factor passed) if the owner enrolled two-factor (restrictive policy)
  - admins are listed in the `admins` table; policies call `public.is_admin()`; admin and provider are enforced as separate logins - an admin session is refused the provider area by `requireProvider()`
- **Auth** - email + password, optional email confirmation (PKCE, via `/auth/callback`), TOTP two-factor, admin API (delete user)
- **Storage** - public bucket `item-images`, each provider may write only in the folder named after their user id
- **Admin-defined product fields** - `categories` + `field_definitions` tables; item values live in `items.attributes` (JSONB), validated by a trigger; `search_items()` RPC for filtering; a provider's own profile picks its `category_id` from the same `categories` list. See [howto/categories-and-fields.md](howto/categories-and-fields.md)
- **Code-defined provider fields** - the profile and private-details forms are generated from one catalog, `web/lib/providerFields.ts`. See [howto/provider-fields.md](howto/provider-fields.md)
- **Generated types** - `npm run db:types` regenerates `web/lib/database.types.ts` after schema changes
- **Two keys** - the *publishable* key (RLS applies) is used everywhere; the *secret* key (bypasses RLS) only in [`web/lib/supabase/admin.ts`](web/lib/supabase/admin.ts) for deleting users and reading emails

### Implementation summary

**Assumptions made** (change as the project evolves):
- Providers are generic service providers; what they publish are *items* (things to sell).
- Private details: legal name, date of birth, national ID, private phone, address.
- New providers start as `pending` and are hidden until an admin approves them.
- Item currency defaults to USD and can be changed per item.

**Data model**

| Table | Contents | Who can access |
|---|---|---|
| `admins` | user ids of admins | rows added only via `npm run create-admin` (secret key) |
| `categories` | admin-managed list of product categories (slug, name, active) | public read; admins write |
| `field_definitions` | per-category fields: label, type, required, options, min/max, filterable | public read; admins write |
| `providers` | public profile + `category_id` (from `categories`) + `status` (`pending` / `approved` / `denied` / `suspended`) + admin note + review timestamps (`status_changed_at` / `status_seen_at`) | public if approved; owner; admins |
| `provider_private` | sensitive personal details | owner (aal2 if two-factor is enrolled); admins |
| `items` | title, description, price, currency, image path, `category_id`, `attributes` (JSONB, validated against the category's fields), published / hidden flags | public if published, not hidden and provider approved; owner; admins |
| storage `item-images` | item images at `<user id>/<file>` | public read; owner writes; owner/admin delete |

Deleting a provider deletes the auth user; the database cascades to their profile, private data and items, and the app removes their images.

**Project layout**

```
supabase/
  config.toml                 auth settings (email confirmation off, TOTP, redirect URLs)
  migrations/                 schema, RLS policies, triggers, storage bucket
web/
  proxy.ts                    refreshes the Supabase session on every request
  lib/supabase/               server / browser / admin (secret key) clients
  lib/auth.ts                 requireProvider() / requireAdmin() page guards
  lib/database.types.ts       generated from the DB (npm run db:types)
  app/                        routes (see table above); Server Actions in actions.ts files
  components/                 forms, two-factor setup/challenge, badges
  scripts/create-admin.mjs    create or promote an admin user
  scripts/verify-schema.mjs   schema/data consistency audit (npm run verify-schema)
```

**How it was verified**
- 38 RLS checks straight against the Supabase API (anon, two providers, admin): self-approval blocked, cross-provider reads/writes blocked, storage folder isolation, two-factor (aal1 vs aal2) on private data, cascade delete.
- 25 page checks: every route renders for the right user; protected routes redirect anonymous users, non-admins and users who still need the two-factor step.
- 26 end-to-end form flows: sign-up → confirmation email in Mailpit (tested with confirmation on) → profile → private data → item with image → edit / remove image → admin approval → public page → delete item → delete provider → sign out.
- Later additions (categories & fields, provider `category_id`, admin/provider role separation) were verified by `npm run verify-schema` (see `web/scripts/verify-schema.mjs`) plus targeted trigger tests run directly against Postgres, not a re-run of the full suite above.

**Lessons learned while building**
- `getClaims()` only verifies the JWT locally, so a deleted user's token keeps working until it expires. Page guards use `getUser()` (asks the Auth server) instead.
- `signOut()` defaults to **global** scope (logs the user out on every device). Use `signOut({ scope: "local" })` for a normal logout.
- On public pages, filter explicitly (`status = 'approved'`, `is_published`), because a logged-in owner's or admin's own RLS policies let them see more rows than a visitor.

**Known limitations**
- The image bucket is public: anyone with an image URL can view it, even for draft items.
- Services bind to `0.0.0.0` (see the security notice above); fine for local learning only.
- Admin and provider are separate logins, enforced per browser session (one cookie jar = one identity): to act as both at once, use two browsers or a private/incognito window.
