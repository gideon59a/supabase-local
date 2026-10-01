import type { ProviderFieldDef, ProviderFieldValues } from "@/lib/providerFields";

// Read-only label/value list for provider account fields (used on the admin
// provider detail page). Skips fields with no value.
export function ProviderFieldList({ defs, values }: { defs: ProviderFieldDef[]; values: ProviderFieldValues | null }) {
  const rows = defs.map((def) => ({ def, text: values?.[def.key] })).filter((r) => r.text);
  if (rows.length === 0) return <p className="muted">Nothing filled in yet.</p>;

  return (
    <dl className="details">
      {rows.map(({ def, text }) => (
        <div key={def.key} style={{ display: "contents" }}>
          <dt>{def.label}</dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  );
}
