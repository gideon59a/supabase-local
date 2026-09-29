// Create (or promote) an admin user.
//   npm run create-admin -- you@example.com "a-strong-password"
// Uses the SECRET key from .env.local, so it bypasses RLS.

import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: npm run create-admin -- <email> "<password>"');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Find an existing user with this email, or create one (already confirmed).
const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (user) {
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
  console.log(`Existing user ${email}: password updated.`);
} else {
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  user = data.user;
  console.log(`Created user ${email}.`);
}

const { error } = await supabase.from("admins").upsert({ user_id: user.id });
if (error) throw error;
console.log(`${email} is an admin. Log in at http://localhost:3000/admin/login`);
