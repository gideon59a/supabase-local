import { notFound } from "next/navigation";
import { requireProvider } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { ItemForm } from "@/components/ItemForm";
import { updateItem } from "../../../actions";

export default async function EditItemPage({ params, searchParams }: PageProps<"/providers/items/[itemId]/edit">) {
  const { itemId } = await params;
  const { error, category: switchTo } = (await searchParams) as { error?: string; category?: string };
  const { supabase, user } = await requireProvider(`/providers/items/${itemId}/edit`);

  const { data: item } = await supabase
    .from("items").select("*").eq("id", itemId).eq("provider_id", user.id).maybeSingle();
  if (!item) notFound();

  const { data: categories } = await supabase
    .from("categories").select("id, slug, name, is_active").order("sort_order").order("name");
  const current = categories?.find((c) => c.id === item.category_id);
  const target = (switchTo && categories?.find((c) => c.slug === switchTo && c.is_active)) || current;
  if (!target) notFound();
  const switching = target.id !== item.category_id;

  const { data: defs } = await supabase
    .from("field_definitions").select("*").eq("category_id", target.id).order("sort_order");

  return (
    <div className="card">
      <h1>Edit item</h1>
      <Flash error={error} />

      <form method="get" className="row" style={{ marginBottom: 16 }}>
        <span>Category:</span>
        <select name="category" defaultValue={target.slug}>
          {categories?.filter((c) => c.is_active || c.id === item.category_id).map((c) => (
            <option key={c.id} value={c.slug}>{c.name}{c.is_active ? "" : " (no longer available)"}</option>
          ))}
        </select>
        <button className="btn">Change</button>
      </form>
      {switching && (
        <p className="flash flash-error">
          You are moving this item from {current?.name} to {target.name}. The {current?.name} details will be
          removed when you save.
        </p>
      )}
      {!target.is_active && (
        <p className="flash flash-error">
          This category is no longer available. You can still edit the basics, but to change its details
          move the item to another category.
        </p>
      )}

      <ItemForm
        action={updateItem.bind(null, item.id)}
        category={target}
        defs={defs ?? []}
        item={item}
        keepAttributes={!switching}
        submitLabel="Save changes"
      />
    </div>
  );
}
