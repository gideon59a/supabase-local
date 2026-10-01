import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ItemCard, type ItemCardData } from "@/components/ItemCard";

const ITEM_CARD = "id, title, price, currency, image_path, providers(id, display_name), categories(name)";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { q } = (await searchParams) as { q?: string };
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories").select("slug, name").eq("is_active", true).order("sort_order").order("name");

  // search_items() (a Postgres function) returns only public items; embedding
  // providers/categories works on its result like on a table.
  const { data: items } = await supabase.rpc("search_items", { p_query: q ?? undefined, p_limit: 24 }).select(ITEM_CARD);

  return (
    <div className="stack">
      <h1>Browse</h1>
      <form method="get" className="row">
        <input name="q" defaultValue={q ?? ""} placeholder="Search all items…" style={{ flex: 1, minWidth: 200 }} />
        <button className="btn btn-primary">Search</button>
      </form>

      <nav className="chips">
        {categories?.map((c) => (
          <Link key={c.slug} href={`/c/${c.slug}`}>{c.name}</Link>
        ))}
      </nav>

      <h2>{q ? `Results for “${q}”` : "Latest items"}</h2>
      {!items?.length ? (
        <p className="muted">
          {q ? "Nothing found." : "No items yet."} <Link href="/providers">Become a provider</Link>.
        </p>
      ) : (
        <div className="grid">
          {(items as unknown as ItemCardData[]).map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}
