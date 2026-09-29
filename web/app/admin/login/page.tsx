import { Flash } from "@/components/Flash";
import { adminLogIn } from "./actions";

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { error } = (await searchParams) as { error?: string };

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h1>Admin log in</h1>
      <Flash error={error} />
      <form action={adminLogIn} className="form">
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="btn btn-primary">Log in</button>
      </form>
    </div>
  );
}
