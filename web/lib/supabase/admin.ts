import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Uses the SECRET key: bypasses Row Level Security and can manage auth users.
// Server-only - "server-only" makes the build fail if a Client Component imports this.
// Always check the caller is an admin before using it.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
