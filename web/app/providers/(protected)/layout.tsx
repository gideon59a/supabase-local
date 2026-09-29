import Link from "next/link";

// Shared sub-navigation. Each page calls requireProvider() itself: layouts are
// not re-run on every navigation, so they are not a reliable auth check.
export default function ProviderAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="subnav">
        <Link href="/providers/dashboard">Dashboard</Link>
        <Link href="/providers/profile">Public profile</Link>
        <Link href="/providers/account">Account &amp; security</Link>
        <Link href="/providers/items">My items</Link>
      </nav>
      {children}
    </>
  );
}
