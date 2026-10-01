import Link from "next/link";
import { providerFieldsFor } from "@/lib/providerFields";

const TYPE_LABEL: Record<string, string> = {
  text: "Short text",
  long_text: "Long text",
  tel: "Phone number",
  email: "Email address",
  url: "Web address",
  date: "Date",
};

// Explains every account field to providers, generated from the same
// catalog (lib/providerFields.ts) the profile/account forms use.
export default function AccountFieldsHelpPage() {
  const publicFields = providerFieldsFor("providers");
  const privateFields = providerFieldsFor("provider_private");

  return (
    <div className="stack">
      <h1>Your account fields explained</h1>
      <p className="muted">
        These are separate from product details, which depend on the category - see{" "}
        <Link href="/providers/help/fields">Field help for items</Link>.
      </p>

      <section className="card stack">
        <div>
          <h2 style={{ margin: 0 }}>Public profile</h2>
          <p className="muted" style={{ margin: 0 }}>
            Visible to everyone once an admin approves you. Edit on{" "}
            <Link href="/providers/profile">Public profile</Link>.
          </p>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          <strong>Category</strong> is also part of your public profile, but isn&apos;t listed below: it&apos;s a
          dropdown of the site&apos;s admin-defined categories (the same list used for items), not free text.
        </p>
        <FieldTable fields={publicFields} />
      </section>

      <section className="card stack">
        <div>
          <h2 style={{ margin: 0 }}>Private details</h2>
          <p className="muted" style={{ margin: 0 }}>
            Visible only to you and site admins - never shown publicly. Edit on{" "}
            <Link href="/providers/account">Account &amp; security</Link>.
          </p>
        </div>
        <FieldTable fields={privateFields} />
      </section>
    </div>
  );
}

function FieldTable({ fields }: { fields: ReturnType<typeof providerFieldsFor> }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Field</th><th>What it means</th><th>Type</th></tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.key}>
              <td>
                {f.label}
                {f.required && <span className="pill" style={{ marginLeft: 6 }}>required</span>}
              </td>
              <td>{f.help}</td>
              <td>{TYPE_LABEL[f.type] ?? f.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
