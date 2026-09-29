"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Enrollment = { factorId: string; qr: string; secret: string };

// Enroll / remove an authenticator app (TOTP). Runs in the browser because the
// QR code is shown and verified interactively.
export function MfaSetup() {
  const [supabase] = useState(createClient);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadFactor() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactorId(data?.totp[0]?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactorId(data?.totp[0]?.id ?? null);
      setLoading(false);
    });
  }, [supabase]);

  async function startEnroll() {
    setError(null);
    // Remove leftovers from an abandoned enrollment (unverified factors).
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) {
      if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${new Date().toISOString()}`,
    });
    if (error) return setError(error.message);
    const qr = data.totp.qr_code.startsWith("data:")
      ? data.totp.qr_code
      : `data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`;
    setEnrollment({ factorId: data.id, qr, secret: data.totp.secret });
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollment) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
    if (error) return setError(error.message);
    setEnrollment(null);
    setCode("");
    await loadFactor();
  }

  async function remove() {
    if (!factorId || !confirm("Remove two-factor authentication?")) return;
    setError(null);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return setError(error.message);
    // Removing a factor lowers the session back to aal1; refresh the tokens.
    await supabase.auth.refreshSession();
    await loadFactor();
  }

  if (loading) return <p className="muted">Loading…</p>;

  if (factorId) {
    return (
      <div className="stack">
        {error && <p className="flash flash-error">{error}</p>}
        <p>✅ An authenticator app is enabled. You will be asked for a code when you log in.</p>
        <button className="btn btn-danger" onClick={remove}>Remove authenticator</button>
      </div>
    );
  }

  if (enrollment) {
    return (
      <form className="form" onSubmit={confirmEnroll}>
        {error && <p className="flash flash-error">{error}</p>}
        <p>Scan this QR code with Google Authenticator, Microsoft Authenticator, 1Password, etc.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={enrollment.qr}
          alt="Authenticator QR code"
          width={180}
          height={180}
          style={{ background: "#fff", padding: 8, borderRadius: 8 }}
        />
        <p className="muted">
          Or enter this key manually: <code>{enrollment.secret}</code>
        </p>
        <label>
          6-digit code from the app
          <input
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
          />
        </label>
        <div className="row">
          <button className="btn btn-primary">Turn on</button>
          <button type="button" className="btn" onClick={() => setEnrollment(null)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="stack">
      {error && <p className="flash flash-error">{error}</p>}
      <p className="muted">Add a second login step using an authenticator app on your phone.</p>
      <button className="btn btn-primary" onClick={startEnroll}>Set up authenticator app</button>
    </div>
  );
}
