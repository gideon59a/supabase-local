"use server";

import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/auth";
import { field, redirectWithError, redirectWithMessage } from "@/lib/utils";

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

  const displayName = field(formData, "display_name");
  if (!displayName || displayName.length < 2) {
    redirectWithError("/providers/profile", "Display name must be at least 2 characters.");
  }

  // Upsert = insert the first time, update afterwards. status is not sent:
  // the providers_guard trigger forces 'pending' and blocks self-approval.
  const { error } = await supabase.from("providers").upsert({
    id: user.id,
    display_name: displayName,
    category: field(formData, "category"),
    city: field(formData, "city"),
    phone_public: field(formData, "phone_public"),
    description: field(formData, "description"),
  });
  if (error) redirectWithError("/providers/profile", error.message);

  revalidatePath("/", "layout");
  redirectWithMessage("/providers/profile", "Profile saved.");
}

// ---------- Private data ----------

export async function savePrivateData(formData: FormData) {
  const { supabase, user } = await requireProvider("/providers/account");

  const { error } = await supabase.from("provider_private").upsert({
    provider_id: user.id,
    full_legal_name: field(formData, "full_legal_name"),
    date_of_birth: field(formData, "date_of_birth"),
    national_id: field(formData, "national_id"),
    phone_private: field(formData, "phone_private"),
    address: field(formData, "address"),
  });
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
  const backTo = "/providers/items/new";
  const { supabase, user } = await requireProvider(backTo);

  const { data: profile } = await supabase.from("providers").select("id").eq("id", user.id).maybeSingle();
  if (!profile) redirectWithError("/providers/profile", "Create your profile before adding items.");

  const fields = readItemFields(formData, backTo);
  const imagePath = await uploadImage(supabase, user.id, formData, backTo);

  const { error } = await supabase.from("items").insert({ ...fields, image_path: imagePath });
  if (error) {
    if (imagePath) await supabase.storage.from(BUCKET).remove([imagePath]);
    redirectWithError(backTo, error.message);
  }

  revalidatePath("/", "layout");
  redirectWithMessage("/providers/items", "Item added.");
}

export async function updateItem(itemId: string, formData: FormData) {
  const backTo = `/providers/items/${itemId}/edit`;
  const { supabase, user } = await requireProvider(backTo);

  // RLS returns nothing if this item belongs to someone else.
  const { data: item } = await supabase
    .from("items").select("image_path").eq("id", itemId).eq("provider_id", user.id).maybeSingle();
  if (!item) redirectWithError("/providers/items", "Item not found.");

  const fields = readItemFields(formData, backTo);
  const newImage = await uploadImage(supabase, user.id, formData, backTo);
  const removeImage = formData.get("remove_image") === "on";
  const imagePath = newImage ?? (removeImage ? null : item.image_path);

  const { error } = await supabase.from("items").update({ ...fields, image_path: imagePath }).eq("id", itemId);
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
