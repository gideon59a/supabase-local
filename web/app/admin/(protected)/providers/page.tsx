import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import type { Database } from "@/lib/database.types";
import { Flash } from "@/components/Flash";
import { StatusBadge } from "@/components/StatusBadge";

type Status = Database["public"]["Enums"]["provider_status"];
const FILTERS: Status[] = ["pending", "approved", "denied", "suspended"];

export default async function AdminProvidersPage({ searchParams }: PageProps<"/admin/providers">) {
  const { status, error, message } = (await searchParams) as {
    status?: string;
    error?: string;
    message?: string;
  };
  const { supabase } = await requireAdmin("/admin/providers");

  let query = supabase
    .from("providers")
    .select("id, display_name, category, city, status, created_at")
    .order("created_at", { ascending: false });
  if (FILTERS.includes(status as Status)) query = query.eq("status", status as Status);
  const { data: providers } = await query;

  return (
    <div className="stack">
      <h1>Providers</h1>
      <Flash error={error} message={message} />
      <div className="row">
        <Link href="/admin/providers" className="btn">All</Link>
        {FILTERS.map((s) => (
          <Link key={s} href={`/admin/providers?status=${s}`} className="btn">{s}</Link>
        ))}
      </div>

      {!providers?.length ? (
        <p className="muted">No providers{status ? ` with status "${status}"` : ""}.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Category</th><th>City</th><th>Status</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/admin/providers/${p.id}`}>{p.display_name}</Link></td>
                  <td>{p.category}</td>
                  <td>{p.city}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
