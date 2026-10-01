import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readFilters } from "@/lib/fields";
import { FilterForm } from "@/components/FilterForm";
import { ItemCard, type ItemCardData } from "@/components/ItemCard";

const ITEM_CARD = "id, title, price, currency, image_path, providers(id, display_name), categories(name)";

// One category with a filter sidebar generated from its filterable fields.
// Filters live in the URL (?q=...&f.level=beginner&f.duration_minutes.min=30).
export default async function CategoryPage({ params, searchParams }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const query = (await searchParams) as Record<string, string | string[] | undefined>;
  const supabase = await createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id, slug, name, description, field_definitions(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .order("sort_order", { referencedTable: "field_definitions" })
    .maybeSingle();
  if (!category) notFound();

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const num = (v: string | string[] | undefined) => (one(v) && Number.isFinite(Number(one(v))) ? Number(one(v)) : undefined);

  const { data: items, error } = await supabase
    .rpc("search_items", {
      p_category: slug,
      p_query: one(query.q),
      p_min_price: num(query.min_price),
      p_max_price: num(query.max_price),
      p_filters: readFilters(query, category.field_definitions),
      p_sort: one(query.sort),
    })
    .select(ITEM_CARD);

  return (
    <div className="stack">
      <div>
        <p className="muted" style={{ margin: 0 }}><Link href="/">Browse</Link> /</p>
        <h1 style={{ marginBottom: 4 }}>{category.name}</h1>
        {category.description && <p className="muted" style={{ margin: 0 }}>{category.description}</p>}
      </div>

      <div className="browse">
        <aside className="card">
          <FilterForm action={`/c/${slug}`} defs={category.field_definitions} params={query} />
        </aside>
        <section>
          {error && <p className="flash flash-error">{error.message}</p>}
          <p className="muted" style={{ marginTop: 0 }}>{items?.length ?? 0} item(s)</p>
          {items?.length ? (
            <div className="grid">
              {(items as unknown as ItemCardData[]).map((item) => <ItemCard key={item.id} item={item} />)}
            </div>
          ) : (
            <p className="muted">No items match these filters.</p>
          )}
        </section>
      </div>
    </div>
  );
}
