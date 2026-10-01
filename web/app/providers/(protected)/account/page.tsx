import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { providerFieldsFor } from "@/lib/providerFields";
import { Flash } from "@/components/Flash";
import { MfaSetup } from "@/components/MfaSetup";
import { ProviderFieldInputs } from "@/components/ProviderFieldInputs";
import { changePassword, savePrivateData } from "../actions";

export default async function AccountPage({ searchParams }: PageProps<"/providers/account">) {
  const { error, message } = (await searchParams) as { error?: string; message?: string };
  const { supabase, user } = await requireProvider("/providers/account");

  const { data: profile } = await supabase.from("providers").select("id").eq("id", user.id).maybeSingle();
  const { data: priv } = await supabase
    .from("provider_private").select("*").eq("provider_id", user.id).maybeSingle();

  return (
    <div className="stack">
      <h1>Account &amp; security</h1>
      <Flash error={error} message={message} />

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Private details</h2>
        <p className="muted">
          Only you and the site admins can see these. They are never shown publicly.{" "}
          <Link href="/providers/help/account">What does each field mean?</Link>
        </p>
        {profile ? (
          <form action={savePrivateData} className="form">
            <ProviderFieldInputs defs={providerFieldsFor("provider_private")} values={priv} />
            <button className="btn btn-primary">Save private details</button>
          </form>
        ) : (
          <p>
            <Link href="/providers/profile">Create your public profile</Link> first.
          </p>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Change password</h2>
        <p className="muted">Signed in as {user.email}</p>
        <form action={changePassword} className="form">
          <label>
            New password
            <input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <label>
            Confirm new password
            <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <button className="btn">Change password</button>
        </form>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Two-factor authentication</h2>
        <MfaSetup />
      </section>
    </div>
  );
}
