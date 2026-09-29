import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

// The confirmation email links here with ?code=... (PKCE flow).
// Exchanging the code creates the session cookies in this browser.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/providers/dashboard");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  const message =
    searchParams.get("error_description") ??
    "The link is invalid or expired. Open it in the same browser you signed up with, or log in.";
  return NextResponse.redirect(
    `${origin}/providers/login?error=${encodeURIComponent(message)}`,
  );
}
