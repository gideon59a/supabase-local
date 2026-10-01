import { field } from "@/lib/utils";

// Single source of truth for every provider *account* field (as opposed to
// product/category fields, which admins define in the database - see
// lib/fields.ts). This list is developer-controlled: adding a column here
// means editing code and running a migration. See howto/provider-fields.md.
//
// Each entry drives: the profile / account form (input + help text), the
// admin's provider detail page, and the providers' help page
// (/providers/help/account). Add a column with a migration, then one entry
// here - nothing else needs to change.

export type ProviderFieldType = "text" | "long_text" | "tel" | "email" | "url" | "date";
export type ProviderFieldTable = "providers" | "provider_private";

export interface ProviderFieldDef {
  key: string; // column name in the table below
  table: ProviderFieldTable;
  label: string;
  help: string; // shown under the input and on the help page
  type: ProviderFieldType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
}

export const PROVIDER_FIELDS: ProviderFieldDef[] = [
  // ---- providers: public profile (RLS: public once approved; see migration) ----
  {
    key: "display_name",
    table: "providers",
    label: "Display name",
    help: "Shown publicly as your name on the marketplace.",
    type: "text",
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  // category is NOT in this catalog: it's a select sourced from public.categories
  // (the same list items use), not a scalar column this generic system can render.
  // See the profile page and saveProfile() in actions.ts.
  {
    key: "city",
    table: "providers",
    label: "City",
    help: "Shown publicly so visitors know roughly where you are.",
    type: "text",
    maxLength: 100,
  },
  {
    key: "phone_public",
    table: "providers",
    label: "Public phone",
    help: "Shown publicly on your profile. Leave blank to keep your phone private.",
    type: "tel",
    maxLength: 30,
  },
  {
    key: "description",
    table: "providers",
    label: "Description",
    help: "A longer public description of what you offer.",
    type: "long_text",
    maxLength: 2000,
  },

  // ---- provider_private: only the owner and admins (RLS; aal2 required if 2FA is enrolled) ----
  {
    key: "full_legal_name",
    table: "provider_private",
    label: "Full legal name",
    help: "Your legal name, for admin records. Never shown publicly.",
    type: "text",
    maxLength: 200,
  },
  {
    key: "date_of_birth",
    table: "provider_private",
    label: "Date of birth",
    help: "For age verification if needed. Never shown publicly.",
    type: "date",
  },
  {
    key: "national_id",
    table: "provider_private",
    label: "National ID / passport number",
    help: "Used to verify your identity. Never shown publicly.",
    type: "text",
    maxLength: 50,
  },
  {
    key: "phone_private",
    table: "provider_private",
    label: "Private phone",
    help: "Used by admins to contact you if needed. Never shown publicly.",
    type: "tel",
    maxLength: 30,
  },
  {
    key: "address",
    table: "provider_private",
    label: "Address",
    help: "Your postal address, for admin records. Never shown publicly.",
    type: "long_text",
    maxLength: 500,
  },
];

export const providerFieldsFor = (table: ProviderFieldTable) => PROVIDER_FIELDS.filter((f) => f.table === table);

export type ProviderFieldValues = Record<string, string | null | undefined>;

// Thrown by readProviderFields on the first invalid field; callers catch it
// and redirect with .message. Keeping this module free of next/navigation
// imports lets it be used from Server Components too (for display) without
// pulling in redirect().
export class ProviderFieldError extends Error {}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Form -> column values for one table, validated against each field's own
// rules. The database has no extra checks on these columns (unlike category
// attributes), so this is the only validation - keep it in sync with any
// column constraints added in migrations.
export function readProviderFields(formData: FormData, table: ProviderFieldTable): Record<string, string | null> {
  const values: Record<string, string | null> = {};
  for (const def of providerFieldsFor(table)) {
    const value = field(formData, def.key);

    if (def.required && !value) throw new ProviderFieldError(`${def.label} is required.`);
    if (value && def.minLength && value.length < def.minLength) {
      throw new ProviderFieldError(`${def.label} must be at least ${def.minLength} characters.`);
    }
    if (value && def.maxLength && value.length > def.maxLength) {
      throw new ProviderFieldError(`${def.label} must be at most ${def.maxLength} characters.`);
    }
    if (value && def.type === "date" && !DATE_RE.test(value)) {
      throw new ProviderFieldError(`${def.label} must be a valid date.`);
    }

    values[def.key] = value;
  }
  return values;
}
