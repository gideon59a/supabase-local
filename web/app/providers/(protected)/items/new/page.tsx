import { requireProvider } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { ItemForm } from "@/components/ItemForm";
import { createItem } from "../../actions";

export default async function NewItemPage({ searchParams }: PageProps<"/providers/items/new">) {
  const { error } = (await searchParams) as { error?: string };
  await requireProvider("/providers/items/new");

  return (
    <div className="card">
      <h1>Add item</h1>
      <Flash error={error} />
      <ItemForm action={createItem} submitLabel="Add item" />
    </div>
  );
}
