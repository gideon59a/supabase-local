import type { Json } from "@/lib/database.types";
import { asAttributes, formatAttribute, type FieldDef } from "@/lib/fields";

// Shows an item's attributes with labels and units (active fields only).
export function AttributeList({ defs, attributes }: { defs: FieldDef[]; attributes: Json }) {
  const values = asAttributes(attributes);
  const rows = defs
    .filter((d) => d.is_active)
    .map((d) => ({ def: d, text: formatAttribute(d, values[d.key]) }))
    .filter((r) => r.text !== null);
  if (rows.length === 0) return null;

  return (
    <dl className="details">
      {rows.map(({ def, text }) => (
        <div key={def.id} style={{ display: "contents" }}>
          <dt>{def.label}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  );
}
