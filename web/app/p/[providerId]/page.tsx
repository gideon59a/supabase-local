import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, itemImageUrl } from "@/lib/utils";

export default async function ProviderPublicPage({ params }: PageProps<"/p/[providerId]">) {
  const { providerId } = await params;
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("providers")
    .select(
      "id, display_name, city, description, phone_public, categories(name), items(id, title, price, currency, image_path)",
    )
    .eq("id", providerId)
    .eq("status", "approved")
    .eq("items.is_published", true)
    .eq("items.is_hidden_by_admin", false)
    .maybeSingle();
  if (!p) notFound();

  return (
    <div className="stack">
      <div>
        <h1 style={{ marginBottom: 4 }}>{p.display_name}</h1>
        <div className="muted">{[p.categories?.name, p.city, p.phone_public].filter(Boolean).join(" · ")}</div>
      </div>
      {p.description && <p style={{ whiteSpace: "pre-wrap" }}>{p.description}</p>}
      <h2>Items</h2>
      {p.items.length === 0 ? (
        <p className="muted">No items published yet.</p>
      ) : (
        <div className="grid">
          {p.items.map((item) => {
            const img = itemImageUrl(item.image_path);
            return (
              <Link key={item.id} href={`/items/${item.id}`} className="card" style={{ textDecoration: "none" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img && <img src={img} alt="" className="item-img" />}
                <div style={{ fontWeight: 600 }}>{item.title}</div>
                <div className="muted">{formatPrice(item.price, item.currency)}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
