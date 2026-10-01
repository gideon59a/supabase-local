# Categories and fields

## The idea

Every item has:

- **Core fields** - the same for every item: title, description, price, currency, image, published.
  These are real database columns.
- **Category fields** - different per category, defined by the admin without code changes.
  Example: *Tutoring* has Subject, Level, Lesson length, Online; *Bakery* has Weight, Allergens, Kosher.

The admin defines category fields in **/admin/categories**. The same definitions drive:
- the provider's item form (inputs, help text, required marks),
- validation (in the database - bad data is rejected even if someone bypasses the app),
- the public item page (labels and units),
- the public filter sidebar (for fields marked *filterable*),
- the providers' help page **/providers/help/fields**.

## Field types

| Type | Input | Min / Max mean | Filter (if filterable) |
|---|---|---|---|
| Short text | one-line text | length | "contains" text box |
| Long text | multi-line text | length | "contains" text box |
| Number | number, decimals allowed | value range | from - to |
| Whole number | number, no decimals | value range | from - to |
| Yes / no | checkbox | - | Any / Yes / No |
| Choose one | dropdown | - | tick any of the options (matches any) |
| Choose several | checkboxes | - | tick options (item must have **all** ticked) |
| Date | date picker | - | from - to |
| Web address | URL starting with `http(s)://` | - | "contains" text box |

"Yes / no" fields are never "missing": an unticked box means *no*.

## Rules for changing fields

These protect items that already use a field. The database enforces them; the admin pages explain why
a change was refused.

| Change | Allowed? |
|---|---|
| Label, help text, unit, order | Always |
| Required on/off | Always. Existing items without a value keep working; the provider must fill it in the next time they change the item's details. The category page shows how many are missing. |
| Filterable on/off | Always |
| Min / max: widen | Always |
| Min / max: narrow | Only if no existing item's value would fall outside the new range. The field's edit page shows the current range in use, so you can see a safe value before trying. |
| Add an option | Always |
| Rename an option's label | Always (items store the option's *value*) |
| Remove an option | Only if no item uses it |
| Change the type | Only while no item uses the field |
| Change the key | Never - create a new field instead |
| Delete a field | Only while no item uses it; otherwise untick **Active** |
| Deactivate a field | Always. It disappears from forms, pages and filters; stored values are kept and come back if reactivated. |

## Categories

| Change | Effect |
|---|---|
| Rename, reorder, edit description | Immediate |
| Change the slug | Changes the public URL `/c/<slug>` (old links break) |
| Deactivate | Cannot be chosen for new items; public page and filters hidden; existing items still shown in search |
| Delete | Only while the category has no items |

Providers can move an item to another category from the item's edit page; the old category's details are
removed when they save.

## How it is stored (for developers)

| Table / column | Content |
|---|---|
| `categories` | slug, name, description, order, active |
| `field_definitions` | per category: key, label, help text, type, required, options, min, max, unit, filterable, order, active |
| `items.category_id` | the item's category |
| `items.attributes` | JSON with the values, e.g. `{"subject": "math", "duration_minutes": 60, "online": true}` |

Database functions: `validate_item_attributes()` (validation), `field_definitions_guard()` (change rules),
`search_items()` (public search and filters), `field_usage_count()` (usage numbers on admin pages).
See [developer.md](developer.md) for how to extend them.
