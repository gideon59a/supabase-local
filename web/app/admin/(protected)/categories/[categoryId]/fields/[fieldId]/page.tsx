import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FieldDefinitionForm } from "@/components/FieldDefinitionForm";
import { deleteField, updateField } from "../../../actions";

export default async function AdminFieldPage({ params, searchParams }: PageProps<"/admin/categories/[categoryId]/fields/[fieldId]">) {
  const { categoryId, fieldId } = await params;
  const { error } = (await searchParams) as { error?: string };
  const { supabase } = await requireAdmin(`/admin/categories/${categoryId}/fields/${fieldId}`);

  const { data: field } = await supabase
    .from("field_definitions").select("*, categories(name)").eq("id", fieldId).eq("category_id", categoryId).maybeSingle();
  if (!field) notFound();
  const { data: used } = await supabase.rpc("field_usage_count", { p_field_id: fieldId });
  const inUse = Number(used ?? 0) > 0;

  // For number/integer/text/long_text: the actual min/max in use today, so the
  // admin can pick a safe new range instead of guessing and hitting the
  // database's rejection (see migration 20261001145714).
  let valueRange: { min: number; max: number; label: string } | null = null;
  if (inUse && (field.type === "number" || field.type === "integer" || field.type === "text" || field.type === "long_text")) {
    const { data: items } = await supabase
      .from("items").select("attributes").eq("category_id", categoryId);
    const numeric = field.type === "number" || field.type === "integer";
    const values = (items ?? [])
      .map((i) => (i.attributes as Record<string, unknown>)[field.key])
      .filter((v) => v !== undefined && v !== null)
      .map((v) => (numeric ? Number(v) : String(v).length))
      .filter((v) => !Number.isNaN(v));
    if (values.length > 0) {
      valueRange = { min: Math.min(...values), max: Math.max(...values), label: numeric ? "value" : "text length" };
    }
  }

  return (
    <div className="stack">
      <h1>Edit field: {field.label}</h1>
      <p className="muted" style={{ margin: 0 }}>
        Category <Link href={`/admin/categories/${categoryId}`}>{field.categories?.name}</Link> · used by {Number(used ?? 0)} item(s)
      </p>
      <Flash error={error} />

      {valueRange && (
        <p className="flash" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          Current data: {Number(used)} item(s) use this field, with {valueRange.label} from{" "}
          <strong>{valueRange.min}</strong> to <strong>{valueRange.max}</strong>. A new Min/Max that excludes
          any of these will be rejected when you save.
        </p>
      )}

      <section className="card">
        <FieldDefinitionForm
          action={updateField.bind(null, categoryId, fieldId)}
          field={field}
          typeLocked={inUse}
          submitLabel="Save field"
        />
      </section>

      <section className="card stack">
        <h2 style={{ marginTop: 0 }}>Rules for changing a field</h2>
        <ul className="muted" style={{ margin: 0 }}>
          <li>Label, help text, unit, order, required and filterable can be changed at any time.</li>
          <li>The key never changes. The type can only change while no item uses the field.</li>
          <li>An option can only be removed if no item uses it. Renaming an option&apos;s label is always fine.</li>
          <li>Min/Max can be widened freely. Narrowing them is blocked if any existing item would fall outside the new range.</li>
          <li>Making a field required affects items only when their details are next changed.</li>
          <li>To retire a field, untick <em>Active</em>: it disappears everywhere, stored values are kept.</li>
        </ul>
        {inUse ? (
          <p className="muted">This field is used by items, so it cannot be deleted. Deactivate it instead.</p>
        ) : (
          <form action={deleteField.bind(null, categoryId, fieldId)}>
            <ConfirmButton message={`Delete field "${field.label}"?`}>Delete field</ConfirmButton>
          </form>
        )}
      </section>

      <p><Link href={`/admin/categories/${categoryId}`}>← Back to {field.categories?.name}</Link></p>
    </div>
  );
}
