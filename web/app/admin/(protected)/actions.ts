"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";
import { field, redirectWithError, redirectWithMessage } from "@/lib/utils";

type Status = Database["public"]["Enums"]["provider_status"];
const STATUSES: Status[] = ["pending", "approved", "denied", "suspended"];
const BUCKET = "item-images";

// Approve / deny / suspend. Runs as the admin user (not the secret key):
// the "Admins can update any provider" RLS policy and providers_guard allow it.
export async function setProviderStatus(providerId: string, formData: FormData) {
  const backTo = `/admin/providers/${providerId}`;
  const { supabase } = await requireAdmin(backTo);

  const status = formData.get("status") as Status;
  if (!STATUSES.includes(status)) redirectWithError(backTo, "Invalid status.");

  const { error } = await supabase
    .from("providers")
    .update({ status, status_note: field(formData, "status_note") })
    .eq("id", providerId);
  if (error) redirectWithError(backTo, error.message);

  revalidatePath("/", "layout");
  redirectWithMessage(backTo, `Provider is now ${status}.`);
}

// Deletes the provider's login account. The database cascades to providers,
// provider_private and items. Deleting auth users requires the secret key.
//
// An admin can also have their own provider profile (same auth user, two
// roles). Deleting that account here would delete their admin login too (the
// admins row cascades from auth.users), so for providerId === the caller's
// own id this instead deletes only the providers row - the provider_private
// and items cascades below still apply (providers.id is the FK target, not
// auth.users), but the login and admin access are left alone.
export async function deleteProvider(providerId: string) {
  const { supabase, user } = await requireAdmin(`/admin/providers/${providerId}`);

  const admin = createAdminClient();

  // Storage files are not rows in our tables, so remove them explicitly.
  const { data: files } = await admin.storage.from(BUCKET).list(providerId, { limit: 1000 });
  if (files?.length) {
    await admin.storage.from(BUCKET).remove(files.map((f) => `${providerId}/${f.name}`));
  }

  if (providerId === user.id) {
    const { error } = await supabase.from("providers").delete().eq("id", providerId);
    if (error) redirectWithError(`/admin/providers/${providerId}`, error.message);
    revalidatePath("/", "layout");
    redirectWithMessage("/admin/providers", "Provider profile deleted. Your admin login was kept.");
  }

  const { error } = await admin.auth.admin.deleteUser(providerId);
  if (error) redirectWithError(`/admin/providers/${providerId}`, error.message);

  revalidatePath("/", "layout");
  redirectWithMessage("/admin/providers", "Provider deleted.");
}

export async function setItemHidden(itemId: string, hidden: boolean, backTo: string) {
  const { supabase } = await requireAdmin(backTo);

  const { error } = await supabase.from("items").update({ is_hidden_by_admin: hidden }).eq("id", itemId);
  if (error) redirectWithError(backTo, error.message);

  revalidatePath("/", "layout");
  redirectWithMessage(backTo, hidden ? "Item hidden." : "Item visible again.");
}

export async function adminDeleteItem(itemId: string, backTo: string) {
  const { supabase } = await requireAdmin(backTo);

  const { data: item, error } = await supabase
    .from("items").delete().eq("id", itemId).select("image_path").maybeSingle();
  if (error) redirectWithError(backTo, error.message);

  if (item?.image_path) await supabase.storage.from(BUCKET).remove([item.image_path]);

  revalidatePath("/", "layout");
  redirectWithMessage(backTo, "Item deleted.");
}
