"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { FIELD_TYPES, parseOptions, slugify, type FieldType } from "@/lib/fields";
import { field, redirectWithError, redirectWithMessage } from "@/lib/utils";

// All writes run as the logged-in admin: RLS ("Admins can ...") allows them and
// the field_definitions_guard trigger enforces the safe-change rules. Its error
// messages are shown to the admin as-is.

const numberOrNull = (formData: FormData, name: string) => {
  const v = field(formData, name);
  return v === null ? null : Number(v);
};

// ---------- Categories ----------

function readCategory(formData: FormData) {
  const name = field(formData, "name") ?? "";
  return {
    name,
    slug: field(formData, "slug") ?? slugify(name),
    description: field(formData, "description"),
    sort_order: numberOrNull(formData, "sort_order") ?? 0,
  };
}

export async function createCategory(formData: FormData) {
  const { supabase } = await requireAdmin("/admin/categories");
  const { data, error } = await supabase.from("categories").insert(readCategory(formData)).select("id").single();
  if (error) redirectWithError("/admin/categories", error.message);
  revalidatePath("/", "layout");
  redirectWithMessage(`/admin/categories/${data.id}`, "Category created. Now add its fields.");
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const backTo = `/admin/categories/${categoryId}`;
  const { supabase } = await requireAdmin(backTo);
  const { error } = await supabase
    .from("categories")
    .update({ ...readCategory(formData), is_active: formData.get("is_active") === "on" })
    .eq("id", categoryId);
  if (error) redirectWithError(backTo, error.message);
  revalidatePath("/", "layout");
  redirectWithMessage(backTo, "Category saved.");
}

export async function deleteCategory(categoryId: string) {
  const backTo = `/admin/categories/${categoryId}`;
  const { supabase } = await requireAdmin(backTo);
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) {
    redirectWithError(
      backTo,
      error.code === "23503" ? "This category has items. Deactivate it instead of deleting it." : error.message,
    );
  }
  revalidatePath("/", "layout");
  redirectWithMessage("/admin/categories", "Category deleted.");
}

// ---------- Fields ----------

function readField(formData: FormData) {
  const type = (field(formData, "type") ?? "text") as FieldType;
  return {
    label: field(formData, "label") ?? "",
    help_text: field(formData, "help_text"),
    type,
    required: formData.get("required") === "on",
    is_filterable: formData.get("is_filterable") === "on",
    unit: field(formData, "unit"),
    min: numberOrNull(formData, "min"),
    max: numberOrNull(formData, "max"),
    options: type === "select" || type === "multi_select" ? parseOptions(String(formData.get("options") ?? "")) : [],
  };
}

export async function createField(categoryId: string, formData: FormData) {
  const backTo = `/admin/categories/${categoryId}`;
  const { supabase } = await requireAdmin(backTo);

  const values = readField(formData);
  if (!FIELD_TYPES.some((t) => t.value === values.type)) redirectWithError(backTo, "Invalid field type.");
  const key = field(formData, "key") ?? slugify(values.label, "_");

  // New fields go to the end of the list.
  const { data: last } = await supabase
    .from("field_definitions").select("sort_order").eq("category_id", categoryId)
    .order("sort_order", { ascending: false }).limit(1).maybeSingle();

  const { error } = await supabase
    .from("field_definitions")
    .insert({ ...values, key, category_id: categoryId, sort_order: (last?.sort_order ?? 0) + 10 });
  if (error) {
    redirectWithError(
      backTo,
      error.code === "23505" ? `A field with key "${key}" already exists in this category.` : error.message,
    );
  }
  revalidatePath("/", "layout");
  redirectWithMessage(backTo, `Field "${values.label}" added.`);
}

export async function updateField(categoryId: string, fieldId: string, formData: FormData) {
  const backTo = `/admin/categories/${categoryId}/fields/${fieldId}`;
  const { supabase } = await requireAdmin(backTo);

  const { error } = await supabase
    .from("field_definitions")
    .update({ ...readField(formData), is_active: formData.get("is_active") === "on" })
    .eq("id", fieldId);
  if (error) redirectWithError(backTo, error.message);
  revalidatePath("/", "layout");
  redirectWithMessage(`/admin/categories/${categoryId}`, "Field saved.");
}

export async function deleteField(categoryId: string, fieldId: string) {
  const backTo = `/admin/categories/${categoryId}/fields/${fieldId}`;
  const { supabase } = await requireAdmin(backTo);
  const { error } = await supabase.from("field_definitions").delete().eq("id", fieldId);
  if (error) redirectWithError(backTo, error.message);
  revalidatePath("/", "layout");
  redirectWithMessage(`/admin/categories/${categoryId}`, "Field deleted.");
}

// Swap a field with its neighbour and renumber the list 10, 20, 30, ...
export async function moveField(categoryId: string, fieldId: string, direction: "up" | "down") {
  const backTo = `/admin/categories/${categoryId}`;
  const { supabase } = await requireAdmin(backTo);

  const { data: fields } = await supabase
    .from("field_definitions").select("id").eq("category_id", categoryId).order("sort_order").order("label");
  const ids = (fields ?? []).map((f) => f.id);
  const i = ids.indexOf(fieldId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) redirect(backTo);
  [ids[i], ids[j]] = [ids[j], ids[i]];

  for (const [index, id] of ids.entries()) {
    const { error } = await supabase.from("field_definitions").update({ sort_order: (index + 1) * 10 }).eq("id", id);
    if (error) redirectWithError(backTo, error.message);
  }
  revalidatePath("/", "layout");
  redirect(backTo);
}
