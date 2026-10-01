import type { Database, Json } from "@/lib/database.types";

// Category-specific item fields ("attributes"). The definitions live in the
// field_definitions table; the database trigger validate_item_attributes() is
// the source of truth for validation. This file only converts between HTML
// form values / URL parameters and the JSON stored in items.attributes.

export type FieldDef = Database["public"]["Tables"]["field_definitions"]["Row"];
export type FieldType = Database["public"]["Enums"]["field_type"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type FieldOption = { value: string; label: string };
export type Attributes = Record<string, Json>;

export const FIELD_TYPES: { value: FieldType; label: string; help: string }[] = [
  { value: "text", label: "Short text", help: "One line of text. Min/max = allowed length." },
  { value: "long_text", label: "Long text", help: "Several lines of text. Min/max = allowed length." },
  { value: "number", label: "Number", help: "Any number, e.g. 2.5. Min/max = allowed range." },
  { value: "integer", label: "Whole number", help: "e.g. 60. Min/max = allowed range." },
  { value: "boolean", label: "Yes / no", help: "A checkbox." },
  { value: "select", label: "Choose one", help: "A dropdown with the options you list." },
  { value: "multi_select", label: "Choose several", help: "Checkboxes with the options you list." },
  { value: "date", label: "Date", help: "A calendar date." },
  { value: "url", label: "Web address", help: "A link starting with http:// or https://." },
];

export const fieldTypeLabel = (t: FieldType) => FIELD_TYPES.find((x) => x.value === t)?.label ?? t;

export function fieldOptions(def: Pick<FieldDef, "options">): FieldOption[] {
  return Array.isArray(def.options) ? (def.options as FieldOption[]) : [];
}

export function asAttributes(value: Json): Attributes {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Attributes) : {};
}

const INPUT_PREFIX = "attr.";
export const inputName = (key: string) => INPUT_PREFIX + key;

// Item form -> attributes JSON. Empty inputs are left out. Values that cannot be
// converted (e.g. "abc" for a number) are passed through unchanged so the
// database reports a clear validation error.
export function readAttributes(formData: FormData, defs: FieldDef[]): Attributes {
  const out: Attributes = {};
  for (const def of defs) {
    const name = inputName(def.key);
    if (def.type === "boolean") {
      out[def.key] = formData.get(name) === "on";
      continue;
    }
    if (def.type === "multi_select") {
      const values = formData.getAll(name).map(String).filter(Boolean);
      if (values.length) out[def.key] = values;
      continue;
    }
    const raw = formData.get(name);
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const text = raw.trim();
    if (def.type === "number" || def.type === "integer") {
      const n = Number(text);
      out[def.key] = Number.isFinite(n) ? n : text;
    } else {
      out[def.key] = text;
    }
  }
  return out;
}

// Attribute value -> display text.
export function formatAttribute(def: FieldDef, value: Json | undefined): string | null {
  if (value === undefined || value === null || value === "") return null;
  const options = fieldOptions(def);
  const optionLabel = (v: Json) => options.find((o) => o.value === v)?.label ?? String(v);
  let text: string;
  switch (def.type) {
    case "boolean":
      text = value ? "Yes" : "No";
      break;
    case "select":
      text = optionLabel(value);
      break;
    case "multi_select":
      if (!Array.isArray(value) || value.length === 0) return null;
      text = value.map(optionLabel).join(", ");
      break;
    case "date":
      text = new Date(String(value) + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      break;
    default:
      text = String(value);
  }
  return def.unit && (def.type === "number" || def.type === "integer") ? `${text} ${def.unit}` : text;
}

// ---------- Public filters (URL query <-> search_items p_filters) ----------

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const all = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

// URL names: f.<key> for single/multiple values, f.<key>.min / f.<key>.max for ranges.
export const filterName = (key: string, part?: "min" | "max") => `f.${key}${part ? "." + part : ""}`;

export function readFilters(params: SearchParams, defs: FieldDef[]): Record<string, Json> {
  const filters: Record<string, Json> = {};
  for (const def of defs) {
    if (!def.is_filterable || !def.is_active) continue;
    const name = filterName(def.key);
    switch (def.type) {
      case "select":
      case "multi_select": {
        const values = all(params[name]).filter(Boolean);
        if (values.length) filters[def.key] = values;
        break;
      }
      case "boolean": {
        const v = first(params[name]);
        if (v === "yes" || v === "no") filters[def.key] = v === "yes";
        break;
      }
      case "number":
      case "integer": {
        const range: Record<string, number> = {};
        const min = Number(first(params[filterName(def.key, "min")]) || NaN);
        const max = Number(first(params[filterName(def.key, "max")]) || NaN);
        if (Number.isFinite(min)) range.min = min;
        if (Number.isFinite(max)) range.max = max;
        if (Object.keys(range).length) filters[def.key] = range;
        break;
      }
      case "date": {
        const range: Record<string, string> = {};
        const min = first(params[filterName(def.key, "min")]);
        const max = first(params[filterName(def.key, "max")]);
        if (min) range.min = min;
        if (max) range.max = max;
        if (Object.keys(range).length) filters[def.key] = range;
        break;
      }
      default: {
        const v = first(params[name]).trim();
        if (v) filters[def.key] = v;
      }
    }
  }
  return filters;
}

export function slugify(text: string, separator = "-") {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, "g"), "");
}

// Admin options textarea: one option per line, "value = Label" or just "Label".
export function parseOptions(text: string): FieldOption[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [left, ...rest] = line.split("=");
      if (rest.length) return { value: left.trim(), label: rest.join("=").trim() };
      return { value: slugify(line, "_"), label: line };
    });
}

export function optionsToText(options: FieldOption[]) {
  return options.map((o) => `${o.value} = ${o.label}`).join("\n");
}
