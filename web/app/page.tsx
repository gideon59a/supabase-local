import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, itemImageUrl } from "@/lib/utils";

export default async function HomePage() {
  const supabase = await createClient();

  // RLS already hides unapproved providers and unpublished items from visitors.
  // The explicit filters keep this page public-only even for logged-in
  // providers/admins, whose own policies let them see more rows.
  const { data: providers } = await supabase
    .from("providers")
    .select("id, display_name, category, city, items(id, title, price, currency, image_path)")
    .eq("status", "approved")
    .eq("items.is_published", true)
    .eq("items.is_hidden_by_admin", false)
    .order("display_name");

  return (
    <div className="stack">
      <h1>Browse providers</h1>
      {!providers?.length ? (
        <p className="muted">
          No approved providers yet. <Link href="/providers">Become a provider</Link>.
        </p>
      ) : (
        providers.map((p) => (
          <section key={p.id} className="card stack">
            <div>
              <Link href={`/p/${p.id}`} style={{ fontSize: 20, fontWeight: 700 }}>{p.display_name}</Link>
              <div className="muted">{[p.category, p.city].filter(Boolean).join(" · ")}</div>
            </div>
            {p.items.length > 0 && (
              <div className="grid">
                {p.items.map((item) => {
                  const img = itemImageUrl(item.image_path);
                  return (
                    <Link key={item.id} href={`/items/${item.id}`} style={{ textDecoration: "none" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {img && <img src={img} alt="" className="item-img" />}
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      <div className="muted">{formatPrice(item.price, item.currency)}</div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
