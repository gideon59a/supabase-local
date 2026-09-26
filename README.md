# supabase-local

A learning project for exploring **Supabase** and its main components, so the knowledge can later be applied (by Claude Code) in real projects.

## Approach

This project uses a **local Supabase stack** (via the Supabase CLI and Docker) rather than the hosted cloud service at supabase.com. Running locally means no account, no costs, and the freedom to reset and experiment.

## Components to explore

- **Postgres database** – tables, SQL, migrations
- **Auth** – sign-up / sign-in, users, sessions
- **Row Level Security (RLS)** – access policies
- **Auto-generated APIs** – REST (PostgREST) and GraphQL
- **Realtime** – subscribing to database changes
- **Storage** – file buckets and access rules
- **Edge Functions** – server-side TypeScript (Deno)
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
