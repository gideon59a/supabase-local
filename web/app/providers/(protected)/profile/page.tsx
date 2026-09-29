import { requireProvider } from "@/lib/auth";
import { Flash } from "@/components/Flash";
import { StatusBadge } from "@/components/StatusBadge";
import { saveProfile } from "../actions";

export default async function ProfilePage({ searchParams }: PageProps<"/providers/profile">) {
  const { error, message } = (await searchParams) as { error?: string; message?: string };
  const { supabase, user } = await requireProvider("/providers/profile");

  const { data: p } = await supabase.from("providers").select("*").eq("id", user.id).maybeSingle();

  return (
    <div className="card">
      <div className="row">
        <h1 style={{ margin: 0 }}>{p ? "Public profile" : "Create your profile"}</h1>
        {p && <StatusBadge status={p.status} />}
      </div>
      <p className="muted">This information is shown publicly once an admin approves you.</p>
      <Flash error={error} message={message} />
      <form action={saveProfile} className="form">
        <label>
          Display name *
          <input name="display_name" defaultValue={p?.display_name ?? ""} required minLength={2} maxLength={100} />
        </label>
        <label>
          Category
          <input name="category" defaultValue={p?.category ?? ""} placeholder="e.g. Plumber, Tutor, Bakery" maxLength={60} />
        </label>
        <label>
          City
          <input name="city" defaultValue={p?.city ?? ""} maxLength={100} />
        </label>
        <label>
          Public phone
          <input name="phone_public" type="tel" defaultValue={p?.phone_public ?? ""} maxLength={30} />
        </label>
        <label>
          Description
          <textarea name="description" defaultValue={p?.description ?? ""} maxLength={2000} />
        </label>
        <button className="btn btn-primary">{p ? "Save profile" : "Create profile"}</button>
      </form>
    </div>
  );
}
