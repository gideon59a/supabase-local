import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Returns the logged-in user, or null. getClaims() verifies the session JWT.
export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return {
    supabase,
    user: claims ? { id: claims.sub, email: claims.email ?? "" } : null,
  };
}

// For protected pages: must be logged in, and must have passed two-factor
// if the user enrolled it. Otherwise redirect to login / the MFA challenge.
// Uses getUser() (asks the Auth server) rather than getClaims() (checks the JWT
// locally): a deleted or banned user is rejected immediately, not when the JWT expires.
export async function requireUser(loginPath: string, returnTo: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(loginPath);
  const user = { id: data.user.id, email: data.user.email ?? "" };

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/auth/mfa?next=${encodeURIComponent(returnTo)}`);
  }
  return { supabase, user };
}

export async function requireProvider(returnTo = "/providers/dashboard") {
  return requireUser("/providers/login", returnTo);
}

// is_admin() is a Postgres function (see the migration); RLS uses the same check.
export async function requireAdmin(returnTo = "/admin") {
  const ctx = await requireUser("/admin/login", returnTo);
  const { data: isAdmin } = await ctx.supabase.rpc("is_admin");
  if (!isAdmin) redirect("/admin/login?error=" + encodeURIComponent("This account is not an admin."));
  return ctx;
}
