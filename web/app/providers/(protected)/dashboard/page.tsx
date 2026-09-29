import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";

const STATUS_HELP = {
  pending: "An admin will review your profile. Until then it is not visible on the public site.",
  approved: "Your profile and published items are visible on the public site.",
  denied: "Your application was denied. You can update your profile; contact the admin for details.",
  suspended: "Your account is suspended. Your profile and items are hidden from the public site.",
} as const;

export default async function DashboardPage() {
  const { supabase, user } = await requireProvider("/providers/dashboard");

  const { data: provider } = await supabase
    .from("providers").select("display_name, status, status_note").eq("id", user.id).maybeSingle();

  const { count: itemCount } = await supabase
    .from("items").select("id", { count: "exact", head: true }).eq("provider_id", user.id);

  if (!provider) {
    return (
      <div className="card stack">
        <h1>Welcome!</h1>
        <p>Start by creating your public profile. After that you can add items.</p>
        <Link href="/providers/profile" className="btn btn-primary">Create profile</Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Hello, {provider.display_name}</h1>
      <div className="card stack">
        <div className="row">Status: <StatusBadge status={provider.status} /></div>
        <p className="muted">{STATUS_HELP[provider.status]}</p>
        {provider.status_note && <p><strong>Note from admin:</strong> {provider.status_note}</p>}
      </div>
      <div className="card row">
        <span>You have {itemCount ?? 0} item(s).</span>
        <Link href="/providers/items" className="btn">Manage items</Link>
        <Link href="/providers/items/new" className="btn btn-primary">Add item</Link>
      </div>
    </div>
  );
}
