import { FIELD_TYPES, fieldOptions, optionsToText, type FieldDef } from "@/lib/fields";

// Admin form for adding or editing one field definition.
export function FieldDefinitionForm({
  action,
  field,
  typeLocked = false,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  field?: FieldDef;
  typeLocked?: boolean; // the field is used by items: its type cannot change
  submitLabel: string;
}) {
  return (
    <form action={action} className="form">
      <label>
        Label * <span className="muted">(what providers and visitors see)</span>
        <input name="label" defaultValue={field?.label ?? ""} required maxLength={80} placeholder="e.g. Lesson length" />
      </label>

      {field ? (
        <p className="muted" style={{ margin: 0 }}>
          Key: <code>{field.key}</code> (fixed; stored in each item&apos;s data)
        </p>
      ) : (
        <label>
          Key <span className="muted">(optional; made from the label if empty. Lowercase letters, digits, _ . Cannot be changed later.)</span>
          <input name="key" pattern="[a-z][a-z0-9_]{0,39}" maxLength={40} placeholder="e.g. duration_minutes" />
        </label>
      )}

      <label>
        Help text <span className="muted">(shown under the input and on the providers&apos; help page)</span>
        <textarea name="help_text" defaultValue={field?.help_text ?? ""} maxLength={500} style={{ minHeight: 60 }} />
      </label>

      <label>
        Type
        {typeLocked && field ? (
          <>
            <input type="hidden" name="type" value={field.type} />
            <input value={FIELD_TYPES.find((t) => t.value === field.type)?.label} disabled />
            <span className="help">Used by items, so the type cannot change. Deactivate this field and add a new one instead.</span>
          </>
        ) : (
          <select name="type" defaultValue={field?.type ?? "text"}>
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}: {t.help}</option>
            ))}
          </select>
        )}
      </label>

      <label>
        Options <span className="muted">(only for &quot;Choose one&quot; / &quot;Choose several&quot;: one per line, <code>value = Label</code> or just <code>Label</code>)</span>
        <textarea
          name="options"
          defaultValue={field ? optionsToText(fieldOptions(field)) : ""}
          placeholder={"beginner = Beginner\nadvanced = Advanced"}
          style={{ minHeight: 90, fontFamily: "monospace" }}
        />
      </label>

      <div className="row" style={{ alignItems: "end" }}>
        <label style={{ flex: 1 }}>
          Min <input name="min" type="number" step="any" defaultValue={field?.min ?? ""} />
        </label>
        <label style={{ flex: 1 }}>
          Max <input name="max" type="number" step="any" defaultValue={field?.max ?? ""} />
        </label>
        <label style={{ flex: 1 }}>
          Unit <input name="unit" maxLength={20} defaultValue={field?.unit ?? ""} placeholder="min, g, …" />
        </label>
      </div>
      <p className="help" style={{ marginTop: -8 }}>Min/max: allowed range for numbers, allowed length for text.</p>

      <label className="check">
        <input type="checkbox" name="required" defaultChecked={field?.required ?? false} /> Required
      </label>
      <label className="check">
        <input type="checkbox" name="is_filterable" defaultChecked={field?.is_filterable ?? false} /> Visitors can filter by this field
      </label>
      {field && (
        <label className="check">
          <input type="checkbox" name="is_active" defaultChecked={field.is_active} /> Active (untick to hide it everywhere; stored values are kept)
        </label>
      )}

      <button className="btn btn-primary">{submitLabel}</button>
    </form>
  );
}
