import Link from "next/link";
import { formatPrice, itemImageUrl } from "@/lib/utils";

export type ItemCardData = {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  image_path: string | null;
  providers?: { id: string; display_name: string } | null;
  categories?: { name: string } | null;
};

export function ItemCard({ item }: { item: ItemCardData }) {
  const img = itemImageUrl(item.image_path);
  return (
    <Link href={`/items/${item.id}`} className="card item-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {img && <img src={img} alt="" className="item-img" />}
      <strong>{item.title}</strong>
      <span>{formatPrice(item.price, item.currency)}</span>
      <span className="muted" style={{ fontSize: 13 }}>
        {[item.categories?.name, item.providers?.display_name].filter(Boolean).join(" · ")}
      </span>
    </Link>
  );
}
