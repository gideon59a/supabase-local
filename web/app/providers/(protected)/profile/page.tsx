import Link from "next/link";
import { requireProvider } from "@/lib/auth";
import { providerFieldsFor } from "@/lib/providerFields";
import { Flash } from "@/components/Flash";
import { StatusBadge } from "@/components/StatusBadge";
import { ProviderFieldInputs } from "@/components/ProviderFieldInputs";
import { saveProfile } from "../actions";

export default async function ProfilePage({ searchParams }: PageProps<"/providers/profile">) {
  const { error, message } = (await searchParams) as { error?: string; message?: string };
  const { supabase, user } = await requireProvider("/providers/profile");

  const { data: p } = await supabase.from("providers").select("*").eq("id", user.id).maybeSingle();

  const { data: activeCategories } = await supabase
    .from("categories").select("id, name").eq("is_active", true).order("sort_order").order("name");
  let categories = activeCategories ?? [];
  // Keep the provider's current category selectable even if an admin has since
  // deactivated it, so saving the rest of the form doesn't silently clear it.
  if (p?.category_id && !categories.some((c) => c.id === p.category_id)) {
    const { data: current } = await supabase.from("categories").select("id, name").eq("id", p.category_id).maybeSingle();
    if (current) categories = [...categories, current];
  }

  const fields = providerFieldsFor("providers");
  const nameField = fields.filter((f) => f.key === "display_name");
  const restFields = fields.filter((f) => f.key !== "display_name");

  return (
    <div className="card">
      <div className="row">
        <h1 style={{ margin: 0 }}>{p ? "Public profile" : "Create your profile"}</h1>
        {p && <StatusBadge status={p.status} />}
      </div>
      <p className="muted">
        This information is shown publicly once an admin approves you.{" "}
        <Link href="/providers/help/account">What does each field mean?</Link>
      </p>
      <Flash error={error} message={message} />
      <form action={saveProfile} className="form">
        <ProviderFieldInputs defs={nameField} values={p} />
        <div className="field">
          <label>
            Category
            <select name="category_id" defaultValue={p?.category_id ?? ""}>
              <option value="">— Select a category —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <div className="help">What kind of work you do. Choose the closest match from the list.</div>
        </div>
        <ProviderFieldInputs defs={restFields} values={p} />
        <button className="btn btn-primary">{p ? "Save profile" : "Create profile"}</button>
      </form>
    </div>
  );
}
