import Link from "next/link";

// Each admin page calls requireAdmin() itself (layouts are not re-run on every navigation).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="subnav">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/providers">Providers</Link>
        <Link href="/admin/items">Items</Link>
        <Link href="/admin/categories">Categories &amp; fields</Link>
      </nav>
      {children}
    </>
  );
}
