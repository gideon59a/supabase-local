import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export default async function ProvidersLanding() {
  const { user } = await getSessionUser();

  return (
    <div className="stack">
      <h1>For providers</h1>
      <p className="muted">
        Create a provider account, fill in your profile, and publish items. An admin reviews
        new providers before they appear on the public site.
      </p>
      {user ? (
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
