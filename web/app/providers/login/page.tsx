import Link from "next/link";
import { Flash } from "@/components/Flash";
import { logIn } from "../actions";

export default async function LoginPage({ searchParams }: PageProps<"/providers/login">) {
  const { error, message } = (await searchParams) as { error?: string; message?: string };

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h1>Provider log in</h1>
      <Flash error={error} message={message} />
      <form action={logIn} className="form">
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="btn btn-primary">Log in</button>
      </form>
      <p className="muted">New here? <Link href="/providers/signup">Create an account</Link></p>
    </div>
  );
}
