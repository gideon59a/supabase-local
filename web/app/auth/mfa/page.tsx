import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { safeNext } from "@/lib/utils";
import { MfaChallenge } from "@/components/MfaChallenge";

// Second login step for users who enrolled an authenticator app.
export default async function MfaPage({ searchParams }: PageProps<"/auth/mfa">) {
  const { next } = await searchParams;
  const target = safeNext(typeof next === "string" ? next : null, "/providers/dashboard");

  const { supabase, user } = await getSessionUser();
  if (!user) redirect("/providers/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2" || aal?.nextLevel !== "aal2") redirect(target);

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <h1>Two-factor check</h1>
      <p className="muted">Enter the 6-digit code from your authenticator app.</p>
      <MfaChallenge next={target} />
    </div>
  );
}
