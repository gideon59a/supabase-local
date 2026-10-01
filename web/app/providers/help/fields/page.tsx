import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fieldOptions, fieldTypeLabel } from "@/lib/fields";

// Explains every category and its fields to providers. Generated from the same
// field_definitions rows the item form uses, so it is always up to date.
export default async function FieldsHelpPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name, description, field_definitions(*)")
    .eq("is_active", true)
    .eq("field_definitions.is_active", true)
    .order("sort_order")
    .order("sort_order", { referencedTable: "field_definitions" });

  return (
    <div className="stack">
      <h1>Categories and their fields</h1>
      <p className="muted">
        Every item belongs to one category. Besides the basics (title, description, price, image), each
        category asks for its own details. Fields marked <strong>required</strong> must be filled in;
        fields marked <strong>filterable</strong> can be used by visitors to find your items.
      </p>
      <nav className="chips">
        {categories?.map((c) => <a key={c.id} href={`#${c.slug}`}>{c.name}</a>)}
      </nav>

      {categories?.map((c) => (
        <section key={c.id} id={c.slug} className="card stack">
          <div>
            <h2 style={{ margin: 0 }}>{c.name}</h2>
            {c.description && <p className="muted" style={{ margin: 0 }}>{c.description}</p>}
          </div>
          {c.field_definitions.length === 0 ? (
            <p className="muted">No extra fields.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Field</th><th>What it means</th><th>Type</th><th>Allowed values</th></tr>
                </thead>
                <tbody>
                  {c.field_definitions.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <strong>{f.label}</strong>
                        <div className="row" style={{ marginTop: 4 }}>
                          {f.required && f.type !== "boolean" && <span className="pill">required</span>}
                          {f.is_filterable && <span className="pill">filterable</span>}
                        </div>
                      </td>
                      <td>{f.help_text}</td>
                      <td>{fieldTypeLabel(f.type)}{f.unit ? ` (${f.unit})` : ""}</td>
                      <td>
                        {fieldOptions(f).map((o) => o.label).join(", ")}
                        {f.min !== null || f.max !== null
                          ? `${f.type === "text" || f.type === "long_text" ? "Length " : ""}${f.min ?? ""}–${f.max ?? ""}`
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link href={`/providers/items/new?category=${c.slug}`} className="btn" style={{ justifySelf: "start" }}>
            Add a {c.name} item
          </Link>
        </section>
      ))}
    </div>
  );
}
