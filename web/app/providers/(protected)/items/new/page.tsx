import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { ItemForm } from "@/components/ItemForm";
import { createItem } from "../../actions";

// Step 1: pick a category (?category=<slug>). Step 2: fill in the form for that category.
export default async function NewItemPage({ searchParams }: PageProps<"/providers/items/new">) {
  const { error, category: slug } = (await searchParams) as { error?: string; category?: string };
  const { supabase } = await requireProvider("/providers/items/new");

  if (!slug) {
    const { data: categories } = await supabase
      .from("categories").select("slug, name, description").eq("is_active", true).order("sort_order").order("name");
    return (
      <div className="stack">
        <h1>Add item: choose a category</h1>
        <Flash error={error} />
        <p className="muted">
          Each category has its own details to fill in.{" "}
          <Link href="/providers/help/fields">See all categories and their fields</Link>.
        </p>
        <div className="grid">
          {categories?.map((c) => (
            <Link key={c.slug} href={`/providers/items/new?category=${c.slug}`} className="card item-card">
              <strong>{c.name}</strong>
              <span className="muted">{c.description}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const { data: category } = await supabase
    .from("categories").select("id, name, field_definitions(*)").eq("slug", slug).eq("is_active", true)
    .order("sort_order", { referencedTable: "field_definitions" }).maybeSingle();
  if (!category) {
    return (
      <div className="card">
        <p>That category is not available. <Link href="/providers/items/new">Choose another</Link>.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Add item: {category.name}</h1>
      <p className="muted"><Link href="/providers/items/new">← Choose a different category</Link></p>
      <Flash error={error} />
      <ItemForm action={createItem} category={category} defs={category.field_definitions} submitLabel="Add item" />
    </div>
  );
}
