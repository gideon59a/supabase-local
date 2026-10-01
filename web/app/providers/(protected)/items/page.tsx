import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteItem } from "../actions";

export default async function MyItemsPage({ searchParams }: PageProps<"/providers/items">) {
  const { error, message } = (await searchParams) as { error?: string; message?: string };
  const { supabase, user } = await requireProvider("/providers/items");

  const { data: items } = await supabase
    .from("items")
    .select("id, title, price, currency, is_published, is_hidden_by_admin, updated_at, categories(name)")
    .eq("provider_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>My items</h1>
        <Link href="/providers/items/new" className="btn btn-primary">Add item</Link>
      </div>
      <Flash error={error} message={message} />

      {!items?.length ? (
        <p className="muted">No items yet. <Link href="/providers/help/fields">See the categories you can use</Link>.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Category</th><th>Price</th><th>Visibility</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.categories?.name}</td>
                  <td>{formatPrice(item.price, item.currency)}</td>
                  <td>
                    {item.is_hidden_by_admin ? "Hidden by admin" : item.is_published ? "Published" : "Draft"}
                  </td>
                  <td>
                    <div className="row" style={{ justifyContent: "end" }}>
                      <Link href={`/providers/items/${item.id}/edit`} className="btn">Edit</Link>
                      <form action={deleteItem.bind(null, item.id)}>
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
