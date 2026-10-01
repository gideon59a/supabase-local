import { fieldOptions, inputName, type Attributes, type FieldDef } from "@/lib/fields";

// Renders the inputs for a category's fields, each with its help text.
// HTML constraints (required, min, max, ...) mirror the definition so most
// mistakes are caught in the browser; the database validates again on save.
export function AttributeInputs({
  defs,
  values = {},
  disabled = false,
}: {
  defs: FieldDef[];
  values?: Attributes;
  disabled?: boolean;
}) {
  const active = defs.filter((d) => d.is_active);
  if (active.length === 0) return <p className="muted">This category has no extra fields.</p>;

  return (
    <>
      {active.map((def) => (
        <div key={def.id} className="field">
          <FieldInput def={def} value={values[def.key]} disabled={disabled} />
          {def.help_text && <div className="help">{def.help_text}</div>}
        </div>
      ))}
    </>
  );
}

function FieldInput({ def, value, disabled }: { def: FieldDef; value: unknown; disabled: boolean }) {
  const name = inputName(def.key);
  const label = (
    <>
      {def.label}
      {def.required && def.type !== "boolean" ? " *" : ""}
      {def.unit ? <span className="muted"> ({def.unit})</span> : null}
    </>
  );
  const common = { name, disabled, required: def.required && !disabled };
  const str = value === undefined || value === null ? "" : String(value);
  const min = def.min ?? undefined;
  const max = def.max ?? undefined;

  switch (def.type) {
    case "boolean":
      return (
        <label className="check">
          <input type="checkbox" name={name} disabled={disabled} defaultChecked={value === true} /> {label}
        </label>
      );
    case "select":
      return (
        <label>
          {label}
          <select {...common} defaultValue={str}>
            <option value="">— choose —</option>
            {fieldOptions(def).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      );
    case "multi_select": {
      const selected = Array.isArray(value) ? value.map(String) : [];
      return (
        <fieldset className="choices">
          <legend>{label}</legend>
          {fieldOptions(def).map((o) => (
            <label key={o.value} className="check">
              <input type="checkbox" name={name} value={o.value} disabled={disabled} defaultChecked={selected.includes(o.value)} />
              {o.label}
            </label>
          ))}
        </fieldset>
      );
    }
    case "long_text":
      return (
        <label>
          {label}
          <textarea {...common} defaultValue={str} minLength={min} maxLength={max} />
        </label>
      );
    case "number":
    case "integer":
      return (
        <label>
          {label}
          <input {...common} type="number" step={def.type === "integer" ? 1 : "any"} min={min} max={max} defaultValue={str} />
        </label>
      );
    case "date":
      return (
        <label>
          {label}
          <input {...common} type="date" defaultValue={str} />
        </label>
      );
    case "url":
      return (
        <label>
          {label}
          <input {...common} type="url" placeholder="https://" defaultValue={str} />
        </label>
      );
    default:
      return (
        <label>
          {label}
          <input {...common} defaultValue={str} minLength={min} maxLength={max} />
        </label>
      );
  }
}
