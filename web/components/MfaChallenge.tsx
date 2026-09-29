"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Upgrades the session from aal1 to aal2 by verifying a TOTP code.
export function MfaChallenge({ next }: { next: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp[0];
    if (listError || !factor) {
      setError(listError?.message ?? "No authenticator app is enrolled.");
      setBusy(false);
      return;
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    // Full reload so the server sees the new (aal2) session cookies.
    window.location.assign(next);
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      {error && <p className="flash flash-error">{error}</p>}
      <label>
        Code
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.trim())}
        />
      </label>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Checking…" : "Verify"}
      </button>
    </form>
  );
}
