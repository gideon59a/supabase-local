import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { createCategory } from "./actions";

export default async function AdminCategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  const { error, message } = (await searchParams) as { error?: string; message?: string };
  const { supabase } = await requireAdmin("/admin/categories");

  // items(count) / field_definitions(count): PostgREST aggregates over the foreign keys.
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name, is_active, sort_order, items(count), field_definitions(count)")
    .order("sort_order")
    .order("name");

  return (
    <div className="stack">
      <h1>Categories</h1>
      <Flash error={error} message={message} />
      <p className="muted">
        Each category defines the extra fields providers fill in for their items.{" "}
        <Link href="/providers/help/fields">See the providers&apos; help page</Link>.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Slug</th><th>Fields</th><th>Items</th><th>Order</th><th>Status</th></tr>
          </thead>
          <tbody>
            {categories?.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/admin/categories/${c.id}`}>{c.name}</Link></td>
                <td><code>{c.slug}</code></td>
                <td>{c.field_definitions[0]?.count ?? 0}</td>
                <td>{c.items[0]?.count ?? 0}</td>
                <td>{c.sort_order}</td>
                <td>{c.is_active ? "Active" : <span className="muted">Inactive</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Add category</h2>
        <form action={createCategory} className="form">
          <label>Name *<input name="name" required maxLength={80} placeholder="e.g. Photography" /></label>
          <label>
            Slug <span className="muted">(used in the URL /c/&lt;slug&gt;; made from the name if empty)</span>
            <input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} placeholder="e.g. photography" />
          </label>
          <label>Description<textarea name="description" maxLength={1000} style={{ minHeight: 60 }} /></label>
          <label>Order <span className="muted">(lower first)</span><input name="sort_order" type="number" defaultValue={100} /></label>
          <button className="btn btn-primary">Add category</button>
        </form>
      </section>
    </div>
  );
}
