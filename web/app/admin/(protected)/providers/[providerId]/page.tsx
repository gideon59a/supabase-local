import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/utils";
import { Flash } from "@/components/Flash";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmButton } from "@/components/ConfirmButton";
import { adminDeleteItem, deleteProvider, setItemHidden, setProviderStatus } from "../../actions";

export default async function AdminProviderPage({ params, searchParams }: PageProps<"/admin/providers/[providerId]">) {
  const { providerId } = await params;
  const { error, message } = (await searchParams) as { error?: string; message?: string };
  const backTo = `/admin/providers/${providerId}`;
  const { supabase } = await requireAdmin(backTo);

  // RLS lets admins read everything, including the private table.
  const { data: p } = await supabase.from("providers").select("*").eq("id", providerId).maybeSingle();
  if (!p) notFound();
  const { data: priv } = await supabase
    .from("provider_private").select("*").eq("provider_id", providerId).maybeSingle();
  const { data: items } = await supabase
    .from("items").select("*").eq("provider_id", providerId).order("created_at", { ascending: false });

  // Email and login info live in auth.users, only reachable with the secret key.
  const { data: authData } = await createAdminClient().auth.admin.getUserById(providerId);
  const authUser = authData?.user;

  return (
    <div className="stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>{p.display_name}</h1>
        <StatusBadge status={p.status} />
      </div>
      <Flash error={error} message={message} />

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Review</h2>
        <form action={setProviderStatus.bind(null, providerId)} className="form">
          <label>
            Note to the provider (optional, they can see it)
            <textarea name="status_note" defaultValue={p.status_note ?? ""} maxLength={500} style={{ minHeight: 60 }} />
          </label>
          <div className="row">
            <button name="status" value="approved" className="btn btn-primary">Approve</button>
            <button name="status" value="denied" className="btn">Deny</button>
            <button name="status" value="suspended" className="btn">Suspend</button>
            <button name="status" value="pending" className="btn">Back to pending</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Public profile</h2>
        <dl className="details">
          <dt>Category</dt><dd>{p.category}</dd>
          <dt>City</dt><dd>{p.city}</dd>
          <dt>Public phone</dt><dd>{p.phone_public}</dd>
          <dt>Description</dt><dd>{p.description}</dd>
          <dt>Joined</dt><dd>{new Date(p.created_at).toLocaleString()}</dd>
        </dl>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Account &amp; private details</h2>
        <dl className="details">
          <dt>Email</dt><dd>{authUser?.email}</dd>
          <dt>Email confirmed</dt><dd>{authUser?.email_confirmed_at ? "yes" : "no"}</dd>
          <dt>Last sign-in</dt><dd>{authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleString() : ""}</dd>
          <dt>Two-factor</dt><dd>{authUser?.factors?.some((f) => f.status === "verified") ? "enabled" : "off"}</dd>
          <dt>Legal name</dt><dd>{priv?.full_legal_name}</dd>
          <dt>Date of birth</dt><dd>{priv?.date_of_birth}</dd>
          <dt>National ID</dt><dd>{priv?.national_id}</dd>
          <dt>Private phone</dt><dd>{priv?.phone_private}</dd>
          <dt>Address</dt><dd>{priv?.address}</dd>
        </dl>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Items ({items?.length ?? 0})</h2>
        {items?.length ? (
          <div className="table-wrap">
            <table>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{formatPrice(item.price, item.currency)}</td>
                    <td>{item.is_hidden_by_admin ? "Hidden" : item.is_published ? "Published" : "Draft"}</td>
                    <td>
                      <div className="row" style={{ justifyContent: "end" }}>
                        <form action={setItemHidden.bind(null, item.id, !item.is_hidden_by_admin, backTo)}>
                          <button className="btn">{item.is_hidden_by_admin ? "Unhide" : "Hide"}</button>
                        </form>
                        <form action={adminDeleteItem.bind(null, item.id, backTo)}>
                          <ConfirmButton message={`Delete "${item.title}"?`}>Delete</ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No items.</p>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Danger zone</h2>
        <p className="muted">Deletes the login account, profile, private details, items and images. Cannot be undone.</p>
        <form action={deleteProvider.bind(null, providerId)}>
          <ConfirmButton message={`Permanently delete ${p.display_name} and all their data?`}>
            Delete provider
          </ConfirmButton>
        </form>
      </section>

      <p><Link href="/admin/providers">← All providers</Link></p>
    </div>
  );
}
