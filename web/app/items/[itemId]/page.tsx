import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, itemImageUrl } from "@/lib/utils";
import { AttributeList } from "@/components/AttributeList";

export default async function ItemPage({ params }: PageProps<"/items/[itemId]">) {
  const { itemId } = await params;
  const supabase = await createClient();

  // providers!inner = inner join: no row unless the provider matches the filter too.
  const { data: item } = await supabase
    .from("items")
    .select(
      "id, title, description, price, currency, image_path, attributes, providers!inner(id, display_name, status), categories(slug, name, is_active, field_definitions(*))",
    )
    .eq("id", itemId)
    .eq("is_published", true)
    .eq("is_hidden_by_admin", false)
    .eq("providers.status", "approved")
    .order("sort_order", { referencedTable: "categories.field_definitions" })
    .maybeSingle();
  if (!item) notFound();

  const img = itemImageUrl(item.image_path);
  const category = item.categories;

  return (
    <div className="stack">
      {category && (
        <p className="muted" style={{ margin: 0 }}>
          <Link href="/">Browse</Link> /{" "}
          {category.is_active ? <Link href={`/c/${category.slug}`}>{category.name}</Link> : category.name}
        </p>
      )}
      <h1>{item.title}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {img && <img src={img} alt="" className="item-img-lg" />}
      <div style={{ fontSize: 22, fontWeight: 700 }}>{formatPrice(item.price, item.currency)}</div>
      {item.description && <p style={{ whiteSpace: "pre-wrap" }}>{item.description}</p>}
      {category && (
        <section className="card">
          <AttributeList defs={category.field_definitions} attributes={item.attributes} />
        </section>
      )}
      <p>
        Offered by <Link href={`/p/${item.providers.id}`}>{item.providers.display_name}</Link>
      </p>
    </div>
  );
}
