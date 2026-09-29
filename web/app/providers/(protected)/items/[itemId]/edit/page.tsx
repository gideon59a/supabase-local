import { notFound } from "next/navigation";
import { requireProvider } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { ItemForm } from "@/components/ItemForm";
import { updateItem } from "../../../actions";

export default async function EditItemPage({ params, searchParams }: PageProps<"/providers/items/[itemId]/edit">) {
  const { itemId } = await params;
  const { error } = (await searchParams) as { error?: string };
  const { supabase, user } = await requireProvider(`/providers/items/${itemId}/edit`);

  const { data: item } = await supabase
    .from("items").select("*").eq("id", itemId).eq("provider_id", user.id).maybeSingle();
  if (!item) notFound();

  return (
    <div className="card">
      <h1>Edit item</h1>
      <Flash error={error} />
      <ItemForm action={updateItem.bind(null, item.id)} item={item} submitLabel="Save changes" />
    </div>
  );
}
