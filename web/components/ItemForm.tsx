import type { Database } from "@/lib/database.types";
import { asAttributes, type FieldDef } from "@/lib/fields";
import { itemImageUrl } from "@/lib/utils";
import { AttributeInputs } from "@/components/AttributeInputs";

type Item = Database["public"]["Tables"]["items"]["Row"];

// Used by both "new item" and "edit item". encType is set automatically by
// React for Server Action forms, so the file input is sent as multipart data.
export function ItemForm({
  action,
  category,
  defs,
  item,
  keepAttributes = true,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  category: { id: string; name: string };
  defs: FieldDef[];
  item?: Item;
  keepAttributes?: boolean; // false when switching the item to another category
  submitLabel: string;
}) {
  const imageUrl = itemImageUrl(item?.image_path ?? null);
  const values = keepAttributes && item ? asAttributes(item.attributes) : {};

  return (
    <form action={action} className="form">
      <input type="hidden" name="category_id" value={category.id} />

      <p className="section-title">Basics</p>
      <label>
        Title *
        <input name="title" defaultValue={item?.title ?? ""} required minLength={2} maxLength={120} />
      </label>
      <label>
        Description
        <textarea name="description" defaultValue={item?.description ?? ""} maxLength={4000} />
      </label>
      <div className="row" style={{ alignItems: "end" }}>
        <label style={{ flex: 2 }}>
          Price
          <input name="price" type="number" min="0" step="0.01" defaultValue={item?.price ?? ""} />
        </label>
        <label style={{ flex: 1 }}>
          Currency
          <input name="currency" defaultValue={item?.currency ?? "USD"} minLength={3} maxLength={3} />
        </label>
      </div>

      <p className="section-title">{category.name} details</p>
      <AttributeInputs defs={defs} values={values} />

      <p className="section-title">Image</p>
      {imageUrl && (
        <div className="stack">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="item-img" style={{ maxWidth: 240 }} />
          <label className="check">
            <input type="checkbox" name="remove_image" /> Remove current image
          </label>
        </div>
      )}
      <label>
        {imageUrl ? "Replace image" : "Image"} (JPEG, PNG, WebP or GIF, max 5 MB)
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
      </label>

      <label className="check">
        <input type="checkbox" name="is_published" defaultChecked={item?.is_published ?? true} />
        Published (visible on the public site once you are approved)
      </label>
      {item?.is_hidden_by_admin && (
        <p className="flash flash-error">An admin has hidden this item from the public site.</p>
      )}
      <button className="btn btn-primary">{submitLabel}</button>
    </form>
  );
}
