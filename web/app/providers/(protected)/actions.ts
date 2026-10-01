"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { field, redirectWithError, redirectWithMessage } from "@/lib/utils";
import { asAttributes, readAttributes } from "@/lib/fields";
import { ProviderFieldError, readProviderFields } from "@/lib/providerFields";

type Supabase = Awaited<ReturnType<typeof requireProvider>>["supabase"];

const BUCKET = "item-images";
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// ---------- Profile (public) ----------

export async function saveProfile(formData: FormData) {
  const { supabase, user } = await requireProvider("/providers/profile");

  // Fields come from the catalog in lib/providerFields.ts; add a field there
  // (plus a migration for the column) rather than here.
  let values: Record<string, string | null>;
  try {
    values = readProviderFields(formData, "providers");
  } catch (e) {
    redirectWithError("/providers/profile", e instanceof ProviderFieldError ? e.message : "Invalid input.");
  }

  // category_id must be a real row in categories (friendly error here); whether
  // it's currently active is enforced by the providers_guard trigger instead,
  // so re-saving the rest of the form doesn't break after a category is deactivated.
  const categoryId = field(formData, "category_id");
  if (categoryId) {
    const { data: category } = await supabase.from("categories").select("id").eq("id", categoryId).maybeSingle();
    if (!category) redirectWithError("/providers/profile", "Choose a valid category.");
  }

  // Upsert = insert the first time, update afterwards. status is not sent:
  // the providers_guard trigger forces 'pending' and blocks self-approval.
  const { error } = await supabase
    .from("providers")
    .upsert({ id: user.id, ...values, category_id: categoryId } as never);
  if (error) redirectWithError("/providers/profile", error.message);

  revalidatePath("/", "layout");
  redirectWithMessage("/providers/profile", "Profile saved.");
}

// ---------- Private data ----------

export async function savePrivateData(formData: FormData) {
  const { supabase, user } = await requireProvider("/providers/account");

  let values: Record<string, string | null>;
  try {
    values = readProviderFields(formData, "provider_private");
  } catch (e) {
    redirectWithError("/providers/account", e instanceof ProviderFieldError ? e.message : "Invalid input.");
  }

  const { error } = await supabase.from("provider_private").upsert({ provider_id: user.id, ...values } as never);
  if (error) redirectWithError("/providers/account", error.message);

  redirectWithMessage("/providers/account", "Private details saved.");
}

export async function changePassword(formData: FormData) {
  const { supabase } = await requireProvider("/providers/account");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) redirectWithError("/providers/account", "Password must be at least 8 characters.");
  if (password !== confirm) redirectWithError("/providers/account", "Passwords do not match.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirectWithError("/providers/account", error.message);

  redirectWithMessage("/providers/account", "Password changed.");
}

// ---------- Items ----------

function readItemFields(formData: FormData, backTo: string) {
  const title = field(formData, "title");
  if (!title || title.length < 2) redirectWithError(backTo, "Title must be at least 2 characters.");

  const priceText = field(formData, "price");
  const price = priceText === null ? null : Number(priceText);
  if (price !== null && (Number.isNaN(price) || price < 0)) {
    redirectWithError(backTo, "Price must be a positive number.");
  }

  return {
    title,
    description: field(formData, "description"),
    price,
    currency: (field(formData, "currency") ?? "USD").toUpperCase(),
    is_published: formData.get("is_published") === "on",
  };
}

// The category chosen in the form plus its field definitions.
async function loadCategory(supabase: Supabase, formData: FormData) {
  const categoryId = field(formData, "category_id");
  if (!categoryId) return null;
  const { data } = await supabase
    .from("categories").select("id, slug, field_definitions(*)").eq("id", categoryId).maybeSingle();
  return data;
}

// Uploads the optional image to Storage at '<user id>/<random>.<ext>'.
// Storage RLS only allows writing inside the user's own folder.
async function uploadImage(supabase: Supabase, userId: string, formData: FormData, backTo: string) {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;

  const ext = IMAGE_TYPES[file.type];
  if (!ext) redirectWithError(backTo, "Image must be JPEG, PNG, WebP or GIF.");
  if (file.size > 5 * 1024 * 1024) redirectWithError(backTo, "Image must be 5 MB or smaller.");

  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) redirectWithError(backTo, `Image upload failed: ${error.message}`);
  return path;
}

export async function createItem(formData: FormData) {
  const { supabase, user } = await requireProvider("/providers/items/new");

  const { data: profile } = await supabase.from("providers").select("id").eq("id", user.id).maybeSingle();
  if (!profile) redirectWithError("/providers/profile", "Create your profile before adding items.");

  const category = await loadCategory(supabase, formData);
  if (!category) redirectWithError("/providers/items/new", "Choose a category.");
  const backTo = `/providers/items/new?category=${category.slug}`;

  const fields = readItemFields(formData, backTo);
  // Validated by the items_validate_attributes trigger; its message is shown on error.
  const attributes = readAttributes(formData, category.field_definitions.filter((d) => d.is_active));
  const imagePath = await uploadImage(supabase, user.id, formData, backTo);

  const { error } = await supabase
    .from("items")
    .insert({ ...fields, category_id: category.id, attributes, image_path: imagePath });
  if (error) {
    if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath]);
    redirectWithError(backTo, error.message);
  }

  revalidatePath("/", "layout");
  redirectWithMessage("/providers/items", "Item added.");
}

export async function updateItem(itemId: string, formData: FormData) {
  let backTo = `/providers/items/${itemId}/edit`;
  const { supabase, user } = await requireProvider(backTo);

  // RLS returns nothing if this item belongs to someone else.
  const { data: item } = await supabase
    .from("items")
    .select("image_path, category_id, attributes")
    .eq("id", itemId)
    .eq("provider_id", user.id)
    .maybeSingle();
  if (!item) redirectWithError("/providers/items", "Item not found.");

  const category = await loadCategory(supabase, formData);
  if (!category) redirectWithError(backTo, "Choose a category.");
  const sameCategory = category.id === item.category_id;
  if (!sameCategory) backTo += `?category=${category.slug}`;

  const fields = readItemFields(formData, backTo);
  const defs = category.field_definitions;
  const attributes = readAttributes(formData, defs.filter((d) => d.is_active));
  if (sameCategory) {
    // Keep values of deactivated fields (they are hidden, not deleted).
    const old = asAttributes(item.attributes);
    for (const d of defs) if (!d.is_active && d.key in old) attributes[d.key] = old[d.key];
  }

  const newImage = await uploadImage(supabase, user.id, formData, backTo);
  const removeImage = formData.get("remove_image") === "on";
  const imagePath = newImage ?? (removeImage ? null : item.image_path);

  const { error } = await supabase
    .from("items")
    .update({ ...fields, category_id: category.id, attributes, image_path: imagePath })
    .eq("id", itemId);
  if (error) {
    if (newImage) await supabase.storage.from(BUCKET).remove([newImage]);
    redirectWithError(backTo, error.message);
  }
  if (item.image_path && item.image_path !== imagePath) {
    await supabase.storage.from(BUCKET).remove([item.image_path]);
  }

  revalidatePath("/", "layout");
  redirectWithMessage("/providers/items", "Item updated.");
}
export async function deleteItem(itemId: string) {
  const { supabase, user } = await requireProvider("/providers/items");

  const { data: item, error } = await supabase
    .from("items").delete().eq("id", itemId).eq("provider_id", user.id).select("image_path").maybeSingle();
  if (error) redirectWithError("/providers/items", error.message);
  if (!item) redirectWithError("/providers/items", "Item not found.");

  if (item.image_path) await supabase.storage.from(BUCKET).remove([item.image_path]);

  revalidatePath("/", "layout");
  redirectWithMessage("/providers/items", "Item deleted.");
}
