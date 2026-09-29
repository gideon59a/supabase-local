import Link from "next/link";
import { Flash } from "@/components/Flash";
import { signUp } from "../actions";

export default async function SignUpPage({ searchParams }: PageProps<"/providers/signup">) {
  const { error, message } = (await searchParams) as { error?: string; message?: string };

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h1>Join as a provider</h1>
      <Flash error={error} message={message} />
      <form action={signUp} className="form">
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>
          Password (at least 8 characters)
          <input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <label>
          Confirm password
          <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <button className="btn btn-primary">Create account</button>
      </form>
      <p className="muted">Already registered? <Link href="/providers/login">Log in</Link></p>
    </div>
  );
}
