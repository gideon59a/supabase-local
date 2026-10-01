# Admin guide

The admin area is part of the app: **http://localhost:3000/admin**.
(Supabase Studio at `:54323` is a developer tool - you do not need it for day-to-day admin work.)

## Getting access

An admin account is created by the developer (only they can make someone an admin):

```bash
cd web
npm run create-admin -- you@example.com "a-strong-password"
```

Then log in at **/admin/login**. Provider accounts are refused there.

Admin and provider are separate roles on separate logins: an admin account cannot open the provider area
(`/providers/...` redirects back to `/admin`), and the database won't let an admin approve their own
provider profile even via direct SQL - only a *different* admin reviewing someone else may. To act as a
provider and as the admin at the same time, use two browsers (e.g. Chrome and Edge) or a normal and a
private window with two different accounts - tabs of the same browser share one login.

## Reviewing providers

New providers start as **pending** and are invisible to the public until you approve them.

1. **/admin** shows how many providers are waiting. Click **pending** (or **Providers → pending**).
2. Open a provider. You see their public profile, email, private details and items.
3. Optionally write a **note** (the provider sees it on their dashboard), then click:

| Button | Effect |
|---|---|
| **Approve** | Profile and published items appear on the public site |
| **Deny** | Stays hidden; the provider sees "denied" and your note |
| **Suspend** | Hides an approved provider and all their items |
| **Back to pending** | Returns to the review queue |

**Delete provider** (bottom of the page) removes the login account, profile, private details, items and
images permanently.

## Moderating items

- **/admin/items** lists every item. **Hide** removes an item from the public site without deleting it
  (the provider sees "Hidden by admin" and cannot unhide it). **Delete** removes it permanently.
- The same buttons are on each provider's page.

## Managing categories and fields

Every item belongs to a category, and each category has its own fields (e.g. Tutoring: subject, level,
lesson length). You manage them at **/admin → Categories & fields**.

Read [categories-and-fields.md](categories-and-fields.md) for the concepts and rules. In short:

**Add a category:** fill in the form at the bottom of **/admin/categories** (name; the URL slug is made
from it). You land on the category page - add its fields there.

**Add a field** (category page → *Add field*):

| Setting | Meaning |
|---|---|
| Label | What providers and visitors see, e.g. "Lesson length" |
| Key | Internal name, made from the label if left empty. **Cannot be changed later.** |
| Help text | Shown under the input and on the providers' help page - explain what to enter |
| Type | Short text, long text, number, whole number, yes/no, choose one, choose several, date, web address |
| Options | For "choose one/several": one per line, `value = Label` or just `Label` |
| Min / Max / Unit | Range for numbers or length for text; unit is shown after the value ("min", "g") |
| Required | Providers must fill it in |
| Visitors can filter | Appears in the filter sidebar on the category's public page |

The category page also shows:
- a **preview** of the form providers will see,
- ↑/↓ buttons to **reorder** fields,
- per field, how many items use it and how many are **missing a value** (after making a field required).

**Changing or retiring fields** - allowed at any time: label, help text, unit, order, required,
filterable. Restricted once items use the field: the type, and removing options that are in use.
To retire a field, untick **Active** (values are kept, the field disappears everywhere).
The app explains any change it refuses.

**Categories:** untick **Active** to stop new items using a category and hide its public page (existing
items stay). A category can be deleted only while it has no items.

## Where visitors see the result

- **/** - search and latest items, with a chip per active category
- **/c/&lt;slug&gt;** - one category with a filter sidebar built from its filterable fields
- **/providers/help/fields** - the field reference providers read (generated from your definitions)
