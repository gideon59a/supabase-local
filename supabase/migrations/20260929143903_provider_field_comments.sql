-- Documents the provider account columns. These descriptions are the database
-- side of the field catalog in web/lib/providerFields.ts (kept in sync by hand
-- when a field's meaning changes); Studio and the API docs display them.
-- Comment-only migration: no data or behavior changes.

comment on column public.providers.display_name is
  'Shown publicly as the provider''s name on the marketplace.';
comment on column public.providers.category is
  'What kind of work the provider does, e.g. Plumber, Tutor, Bakery. Free text.';
comment on column public.providers.city is
  'Shown publicly so visitors know roughly where the provider is.';
comment on column public.providers.phone_public is
  'Shown publicly on the provider''s profile. May be left blank.';
comment on column public.providers.description is
  'A longer public description of what the provider offers.';
comment on column public.providers.status is
  'pending | approved | denied | suspended. Only admins may change it (see providers_guard trigger).';
comment on column public.providers.status_note is
  'Optional note from an admin to the provider, shown on the provider''s dashboard.';

comment on table public.provider_private is
  'Sensitive provider details. Never public: visible only to the owner (aal2 if 2FA is enrolled) and admins.';
comment on column public.provider_private.full_legal_name is
  'Provider''s legal name, for admin records. Never shown publicly.';
comment on column public.provider_private.date_of_birth is
  'For age verification if needed. Never shown publicly.';
comment on column public.provider_private.national_id is
  'National ID or passport number, used to verify identity. Never shown publicly.';
comment on column public.provider_private.phone_private is
  'Used by admins to contact the provider if needed. Never shown publicly.';
comment on column public.provider_private.address is
  'Provider''s postal address, for admin records. Never shown publicly.';
