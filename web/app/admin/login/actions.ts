"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { field, redirectWithError } from "@/lib/utils";

export async function adminLogIn(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirectWithError("/admin/login", "Email and password are required.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirectWithError("/admin/login", error.message);

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut({ scope: "local" }); // this browser only
    redirectWithError("/admin/login", "This account is not an admin.");
  }

  redirect("/admin");
}
