import { redirect } from "next/navigation";

// Pages show ?error=... / ?message=... via <Flash>. Server Actions report back by redirecting.
export function redirectWithError(path: string, error: string): never {
  redirect(withParam(path, "error", error));
}

export function redirectWithMessage(path: string, message: string): never {
  redirect(withParam(path, "message", message));
}

function withParam(path: string, key: string, value: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

// Form fields: trimmed string, or null when empty.
export function field(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Only allow relative in-app paths as redirect targets (prevents open redirects).
export function safeNext(next: string | null | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export function formatPrice(price: number | null, currency: string) {
  if (price === null) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

export function itemImageUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/item-images/${path}`;
}
