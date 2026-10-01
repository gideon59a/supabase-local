import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { Flash } from "@/components/Flash";

export default async function ProvidersLanding() {
  const { supabase, user } = await getSessionUser();
  const { data: isAdmin } = user ? await supabase.rpc("is_admin") : { data: false };

  return (
    <div className="stack">
      <h1>For providers</h1>
      <p className="muted">
        Create a provider account, fill in your profile, and publish items. An admin reviews
        new providers before they appear on the public site.
      </p>
      {isAdmin && (
        <Flash
          error={
            `You're signed in as an admin (${user!.email}). Admin and provider are separate logins here - ` +
            "logging in or signing up below will replace this browser's session with the provider account " +
            "(your admin login is unaffected). To use both at once, sign out first and use a second browser " +
            "or a private/incognito window for one of them."
          }
        />
      )}
      {user && !isAdmin ? (
        <Link href="/providers/dashboard" className="btn btn-primary">Go to your dashboard</Link>
      ) : (
        <div className="row">
          <Link href="/providers/signup" className="btn btn-primary">Join as a provider</Link>
          <Link href="/providers/login" className="btn">Log in</Link>
        </div>
      )}
    </div>
  );
}
