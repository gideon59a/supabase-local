import type { ProviderFieldDef, ProviderFieldValues } from "@/lib/providerFields";

// Renders the inputs for a list of provider account fields, each with its
// help text. Reuses the .field/.help styles from the category-fields feature.
export function ProviderFieldInputs({ defs, values }: { defs: ProviderFieldDef[]; values?: ProviderFieldValues | null }) {
  return (
    <>
      {defs.map((def) => (
        <div key={def.key} className="field">
          <FieldInput def={def} value={values?.[def.key]} />
          <div className="help">{def.help}</div>
        </div>
      ))}
    </>
  );
}

function FieldInput({ def, value }: { def: ProviderFieldDef; value: string | null | undefined }) {
  const label = (
    <>
      {def.label}
      {def.required ? " *" : ""}
    </>
  );
  const common = {
    name: def.key,
    defaultValue: value ?? "",
    required: def.required,
    minLength: def.minLength,
    maxLength: def.maxLength,
    placeholder: def.placeholder,
  };

  if (def.type === "long_text") {
    return (
      <label>
        {label}
        <textarea {...common} />
      </label>
    );
  }

  return (
    <label>
      {label}
      <input type={def.type} {...common} />
    </label>
  );
}
