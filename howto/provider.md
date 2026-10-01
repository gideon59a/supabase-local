# Provider guide

Everything for providers is under **http://localhost:3000/providers**.

## 1. Create your account

1. Go to **/providers** and click **Join as a provider**.
2. Enter your email and a password (at least 8 characters).
3. You are logged in straight away and taken to your profile.

Next time, log in at **/providers/login**.

## 2. Create your public profile

On **Public profile** fill in your display name (required), category of work, city, public phone and a
description. This is what visitors see.

New profiles are **pending**: an admin reviews them before they appear on the public site. Your
**Dashboard** shows your status and any note from the admin:

| Status | Meaning |
|---|---|
| Pending | Waiting for review - not visible to the public yet |
| Approved | Your profile and published items are visible |
| Denied | Not accepted - see the admin's note |
| Suspended | Temporarily hidden, including your items |

## 3. Private details and security

**Account & security** holds details only you and the site admins can see - never shown publicly:
legal name, date of birth, ID number, private phone, address. You can also change your password.

**Two-factor login (recommended):** click *Set up authenticator app*, scan the QR code with Google
Authenticator, Microsoft Authenticator, 1Password or similar, and enter the 6-digit code. From then on
you enter a code from the app after your password. Your private details can only be opened after
this second step.

## 4. Add items

1. **My items → Add item**.
2. **Choose a category.** Each category asks for its own details - see **Field help**
   (**/providers/help/fields**) for what every field means and which values are allowed.
3. Fill in the basics (title, description, price, currency), the category details (fields marked * are
   required - the grey text under each field explains it), and optionally an image (JPEG, PNG, WebP or
   GIF, up to 5 MB).
4. Leave **Published** ticked to show the item once you are approved, or untick it to keep a draft.

**Edit** or **Delete** items from **My items**. To move an item to another category, open it, pick the new
category at the top and click *Change* - the old category's details are removed when you save.

If an item shows **Hidden by admin**, it was removed from the public site by an admin; contact them.

## When is an item public?

All of these must be true:
- your profile is **approved**,
- the item is **published**,
- an admin has not **hidden** it.

Visitors find it on the home page, in its category page (with filters) and on your public page.
