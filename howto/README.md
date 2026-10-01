# How-to guides

Practical instructions for the people who work with the Provider Marketplace demo.
The project overview is in the [main README](../README.md).

| Guide | For | Covers |
|---|---|---|
| [developer.md](developer.md) | Whoever changes the code or database | Running locally, database changes, types, testing, gotchas |
| [admin.md](admin.md) | The site admin | Logging in, reviewing providers, moderating items, managing categories |
| [categories-and-fields.md](categories-and-fields.md) | Admin and developer | Product fields: how categories and fields work, field types, the rules for changing fields |
| [provider-fields.md](provider-fields.md) | Developer | Provider account fields: how to add or change one in code |
| [schema-changes.md](schema-changes.md) | Developer | How to make a database schema change safely: snapshot, staging dry run, verify, rollback |
| [provider.md](provider.md) | Providers (sellers) | Joining, profile, private details, two-factor login, adding items |

Local addresses (while `npx supabase start` and `npm run dev` are running):

| Address | What |
|---|---|
| http://localhost:3000 | The app (public site, `/providers`, `/admin`) |
| http://127.0.0.1:54323 | Supabase Studio: database tables, SQL editor, auth users (developer tool) |
| http://127.0.0.1:54324 | Mailpit: catches all emails sent by local Supabase (developer tool) |

A second local Supabase project, **staging** (`supabase-staging/`), exists purely as a disposable copy for
testing schema changes - see [schema-changes.md](schema-changes.md). It's not running by default; start it
only when following that procedure.

| Address (staging only) | What |
|---|---|
| http://localhost:55321 | Staging API |
| http://127.0.0.1:55323 | Staging Studio |
