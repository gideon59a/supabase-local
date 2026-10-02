import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { adminDeleteItem, setItemHidden } from "../actions";

export default async function AdminItemsPage({ searchParams }: PageProps<"/admin/items">) {
  const {
    error,
    message,
    provider: providerId,
    category: categorySlug,
  } = (await searchParams) as { error?: string; message?: string; provider?: string; category?: string };
  const { supabase } = await requireAdmin("/admin/items");

  const { data: providers } = await supabase.from("providers").select("id, display_name").order("display_name");
  const { data: categories } = await supabase.from("categories").select("id, slug, name").order("sort_order").order("name");
  const category = categorySlug ? categories?.find((c) => c.slug === categorySlug) : undefined;

  // providers(...) / categories(...) follow the items.provider_id / category_id foreign keys (a join).
  let query = supabase
    .from("items")
    .select("id, title, price, currency, is_published, is_hidden_by_admin, provider_id, providers(display_name), categories(name)")
    .order("created_at", { ascending: false });
  if (providerId) query = query.eq("provider_id", providerId);
  if (category) query = query.eq("category_id", category.id);
  const { data: items } = await query;

  // Preserve the current filters when redirecting back after Hide/Delete.
  const params = new URLSearchParams();
  if (providerId) params.set("provider", providerId);
  if (categorySlug) params.set("category", categorySlug);
  const backTo = `/admin/items${params.size ? `?${params}` : ""}`;

  return (
    <div className="stack">
      <h1>All items</h1>
      <Flash error={error} message={message} />

      <form method="get" className="row">
        <select name="provider" defaultValue={providerId ?? ""}>
          <option value="">All providers</option>
          {providers?.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
        <select name="category" defaultValue={categorySlug ?? ""}>
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <button className="btn">Filter</button>
        {(providerId || categorySlug) && <Link href="/admin/items" className="btn">Clear</Link>}
      </form>
      {!items?.length ? (
        <p className="muted">{providerId || categorySlug ? "No items match these filters." : "No items yet."}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Category</th><th>Provider</th><th>Price</th><th>Visibility</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.categories?.name}</td>
                  <td><Link href={`/admin/providers/${item.provider_id}`}>{item.providers?.display_name}</Link></td>
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
      )}
    </div>
  );
}
