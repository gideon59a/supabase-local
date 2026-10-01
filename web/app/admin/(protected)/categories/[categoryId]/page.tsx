import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { fieldTypeLabel } from "@/lib/fields";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { AttributeInputs } from "@/components/AttributeInputs";
import { FieldDefinitionForm } from "@/components/FieldDefinitionForm";
import { createField, deleteCategory, moveField, updateCategory } from "../actions";

export default async function AdminCategoryPage({ params, searchParams }: PageProps<"/admin/categories/[categoryId]">) {
  const { categoryId } = await params;
  const { error, message } = (await searchParams) as { error?: string; message?: string };
  const { supabase } = await requireAdmin(`/admin/categories/${categoryId}`);

  const { data: category } = await supabase.from("categories").select("*").eq("id", categoryId).maybeSingle();
  if (!category) notFound();

  const { data: fields } = await supabase
    .from("field_definitions").select("*").eq("category_id", categoryId).order("sort_order").order("label");
  const { count: itemCount } = await supabase
    .from("items").select("id", { count: "exact", head: true }).eq("category_id", categoryId);

  // Per field: how many items have a value, and (for required fields) how many are missing one.
  const stats = await Promise.all(
    (fields ?? []).map(async (f) => {
      const { data: used } = await supabase.rpc("field_usage_count", { p_field_id: f.id });
      return { id: f.id, used: Number(used ?? 0), missing: f.required && f.is_active && f.type !== "boolean" ? (itemCount ?? 0) - Number(used ?? 0) : 0 };
    }),
  );
  const statFor = (id: string) => stats.find((s) => s.id === id)!;

  return (
    <div className="stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>{category.name}</h1>
        {!category.is_active && <span className="pill">inactive</span>}
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {itemCount ?? 0} item(s) · public page <Link href={`/c/${category.slug}`}>/c/{category.slug}</Link>
      </p>
      <Flash error={error} message={message} />

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Fields</h2>
        {!fields?.length ? (
          <p className="muted">No fields yet. Add the first one below.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Order</th><th>Label</th><th>Key</th><th>Type</th><th>Rules</th><th>Used by</th><th></th></tr>
              </thead>
              <tbody>
                {fields.map((f, i) => {
                  const s = statFor(f.id);
                  return (
                    <tr key={f.id} style={f.is_active ? undefined : { opacity: 0.55 }}>
                      <td>
                        <div className="row" style={{ gap: 4 }}>
                          <form action={moveField.bind(null, categoryId, f.id, "up")}>
                            <button className="btn" disabled={i === 0} title="Move up">↑</button>
                          </form>
                          <form action={moveField.bind(null, categoryId, f.id, "down")}>
                            <button className="btn" disabled={i === fields.length - 1} title="Move down">↓</button>
                          </form>
                        </div>
                      </td>
                      <td>{f.label}</td>
                      <td><code>{f.key}</code></td>
                      <td>{fieldTypeLabel(f.type)}{f.unit ? ` (${f.unit})` : ""}</td>
                      <td>
                        <div className="row" style={{ gap: 4 }}>
                          {f.required && f.type !== "boolean" && <span className="pill">required</span>}
                          {f.is_filterable && <span className="pill">filterable</span>}
                          {!f.is_active && <span className="pill">inactive</span>}
                        </div>
                      </td>
                      <td>
                        {s.used} item(s)
                        {s.missing > 0 && (
                          <div className="help" style={{ color: "var(--danger)" }}>{s.missing} missing a value</div>
                        )}
                      </td>
                      <td><Link href={`/admin/categories/${categoryId}/fields/${f.id}`} className="btn">Edit</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="help">
          &quot;Missing a value&quot;: items created before the field became required. They keep working; the provider
          must fill it in the next time they change the item&apos;s details.
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Add field</h2>
        <FieldDefinitionForm action={createField.bind(null, categoryId)} submitLabel="Add field" />
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Preview: what providers see</h2>
        <div className="form" style={{ pointerEvents: "none" }}>
          <AttributeInputs defs={fields ?? []} disabled />
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Category settings</h2>
        <form action={updateCategory.bind(null, categoryId)} className="form">
          <label>Name *<input name="name" required maxLength={80} defaultValue={category.name} /></label>
          <label>
            Slug <span className="muted">(changing it changes the public URL)</span>
            <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} defaultValue={category.slug} />
          </label>
          <label>Description<textarea name="description" maxLength={1000} defaultValue={category.description ?? ""} style={{ minHeight: 60 }} /></label>
          <label>Order<input name="sort_order" type="number" defaultValue={category.sort_order} /></label>
          <label className="check">
            <input type="checkbox" name="is_active" defaultChecked={category.is_active} />
            Active (inactive: cannot be chosen for items and is hidden from browsing; existing items stay)
          </label>
          <button className="btn btn-primary">Save category</button>
        </form>
        <form action={deleteCategory.bind(null, categoryId)} style={{ marginTop: 16 }}>
          <ConfirmButton message={`Delete category "${category.name}" and its field definitions?`}>
            Delete category
          </ConfirmButton>
          <span className="help"> Only possible while it has no items.</span>
        </form>
      </section>

      <p><Link href="/admin/categories">← All categories</Link></p>
    </div>
  );
}
