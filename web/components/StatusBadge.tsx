import type { Database } from "@/lib/database.types";

type Status = Database["public"]["Enums"]["provider_status"];

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}
