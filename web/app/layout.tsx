import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Provider Marketplace",
  description: "Supabase learning demo",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSessionUser();

  return (
    // suppressHydrationWarning: browser extensions (e.g. LanguageTool) add attributes to <html>.
    <html lang="en" suppressHydrationWarning>
      <body>
        <header className="site">
          <div className="container">
            <Link href="/" className="brand">Marketplace</Link>
            <nav>
              <Link href="/">Browse</Link>
              <Link href="/providers">For providers</Link>
            </nav>
            {user && (
              <div className="who">
                <span>{user.email}</span>
                <form action="/auth/signout" method="post">
                  <button className="btn-link" type="submit">Sign out</button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
