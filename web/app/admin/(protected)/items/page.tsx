import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { adminDeleteItem, setItemHidden } from "../actions";

export default async function AdminItemsPage({ searchParams }: PageProps<"/admin/items">) {
  const { error, message } = (await searchParams) as { error?: string; message?: string };
  const { supabase } = await requireAdmin("/admin/items");

  // providers(...) follows the items.provider_id foreign key (a join).
  const { data: items } = await supabase
    .from("items")
    .select("id, title, price, currency, is_published, is_hidden_by_admin, provider_id, providers(display_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="stack">
      <h1>All items</h1>
      <Flash error={error} message={message} />
      {!items?.length ? (
        <p className="muted">No items yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Provider</th><th>Price</th><th>Visibility</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td><Link href={`/admin/providers/${item.provider_id}`}>{item.providers?.display_name}</Link></td>
                  <td>{formatPrice(item.price, item.currency)}</td>
                  <td>{item.is_hidden_by_admin ? "Hidden" : item.is_published ? "Published" : "Draft"}</td>
                  <td>
                    <div className="row" style={{ justifyContent: "end" }}>
                      <form action={setItemHidden.bind(null, item.id, !item.is_hidden_by_admin, "/admin/items")}>
                        <button className="btn">{item.is_hidden_by_admin ? "Unhide" : "Hide"}</button>
                      </form>
                      <form action={adminDeleteItem.bind(null, item.id, "/admin/items")}>
                        <ConfirmButton message={`Delete "${item.title}"?`}>Delete</ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
