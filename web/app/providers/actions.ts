"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { field, redirectWithError, redirectWithMessage } from "@/lib/utils";

export async function signUp(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email) redirectWithError("/providers/signup", "Email is required.");
  if (password.length < 8) redirectWithError("/providers/signup", "Password must be at least 8 characters.");
  if (password !== confirm) redirectWithError("/providers/signup", "Passwords do not match.");

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/providers/profile` },
  });
  if (error) redirectWithError("/providers/signup", error.message);

  // With email confirmations disabled, Supabase logs the user in immediately.
  if (data.session) redirect("/providers/profile");

  redirectWithMessage(
    "/providers/login",
    "Check your email for a confirmation link. Locally, emails arrive in Mailpit: http://127.0.0.1:54324",
  );
}

export async function logIn(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirectWithError("/providers/login", "Email and password are required.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirectWithError("/providers/login", error.message);

  // If two-factor is enrolled, the dashboard guard sends the user to /auth/mfa first.
  redirect("/providers/dashboard");
}
