import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Flash } from "@/components/Flash";

export default async function AdminOverviewPage({ searchParams }: PageProps<"/admin">) {
  const { error, message } = (await searchParams) as { error?: string; message?: string };
  const { supabase } = await requireAdmin("/admin");

  const { data: providers } = await supabase.from("providers").select("status");
  const { count: itemCount } = await supabase.from("items").select("id", { count: "exact", head: true });

  const counts = { pending: 0, approved: 0, denied: 0, suspended: 0 };
  for (const p of providers ?? []) counts[p.status]++;

  return (
    <div className="stack">
      <h1>Admin</h1>
      <Flash error={error} message={message} />
      {counts.pending > 0 && (
        <p className="flash flash-ok">
          {counts.pending} provider(s) waiting for review.{" "}
          <Link href="/admin/providers?status=pending">Review now</Link>
        </p>
      )}
      <div className="grid">
        {Object.entries(counts).map(([status, n]) => (
          <Link key={status} href={`/admin/providers?status=${status}`} className="card" style={{ textDecoration: "none" }}>
            <div className="muted">{status}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{n}</div>
          </Link>
        ))}
        <Link href="/admin/items" className="card" style={{ textDecoration: "none" }}>
          <div className="muted">items</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{itemCount ?? 0}</div>
        </Link>
      </div>
    </div>
  );
}
