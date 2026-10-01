import Link from "next/link";
import { fieldOptions, filterName, type FieldDef } from "@/lib/fields";

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

// A plain GET form: filters end up in the URL, so results can be bookmarked and shared.
// Filter inputs are generated from the category's filterable fields.
export function FilterForm({ action, defs, params }: { action: string; defs: FieldDef[]; params: Params }) {
  const filterable = defs.filter((d) => d.is_active && d.is_filterable);

  return (
    <form method="get" action={action} className="form filters">
      <label>
        Search
        <input name="q" defaultValue={first(params.q)} placeholder="Title or description" />
      </label>

      {filterable.map((def) => (
        <FilterInput key={def.id} def={def} params={params} />
      ))}

      <fieldset className="choices">
        <legend>Price</legend>
        <div className="row">
          <input name="min_price" type="number" min="0" step="any" placeholder="min" defaultValue={first(params.min_price)} style={{ width: "45%" }} />
          <input name="max_price" type="number" min="0" step="any" placeholder="max" defaultValue={first(params.max_price)} style={{ width: "45%" }} />
        </div>
      </fieldset>

      <label>
        Sort
        <select name="sort" defaultValue={first(params.sort) || "newest"}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </label>

      <div className="row">
        <button className="btn btn-primary">Apply</button>
        <Link href={action} className="btn">Clear</Link>
      </div>
    </form>
  );
}

function FilterInput({ def, params }: { def: FieldDef; params: Params }) {
  const name = filterName(def.key);
  const unit = def.unit ? <span className="muted"> ({def.unit})</span> : null;

  switch (def.type) {
    case "select":
    case "multi_select": {
      const selected = all(params[name]);
      return (
        <fieldset className="choices">
          <legend>
            {def.label}
            {def.type === "multi_select" && <span className="muted"> (has all ticked)</span>}
          </legend>
          {fieldOptions(def).map((o) => (
            <label key={o.value} className="check">
              <input type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} />
              {o.label}
            </label>
          ))}
        </fieldset>
      );
    }
    case "boolean":
      return (
        <label>
          {def.label}
          <select name={name} defaultValue={first(params[name])}>
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      );
    case "number":
    case "integer":
    case "date": {
      const type = def.type === "date" ? "date" : "number";
      return (
        <fieldset className="choices">
          <legend>{def.label}{unit}</legend>
          <div className="row">
            <input name={filterName(def.key, "min")} type={type} step="any" placeholder="from" defaultValue={first(params[filterName(def.key, "min")])} style={{ width: "45%" }} />
            <input name={filterName(def.key, "max")} type={type} step="any" placeholder="to" defaultValue={first(params[filterName(def.key, "max")])} style={{ width: "45%" }} />
          </div>
        </fieldset>
      );
    }
    default:
      return (
        <label>
          {def.label}
          <input name={name} defaultValue={first(params[name])} placeholder="contains…" />
        </label>
      );
  }
}
