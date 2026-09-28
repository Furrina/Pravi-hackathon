# State Government Infrastructure Asset Management System

An internal web application for state government departments to register and manage
physical infrastructure assets — highways, bridges, hospitals, canals, school buildings —
with lifecycle tracking, condition tracking, inspections, maintenance records and an
append-only audit log.

Built as a **modular monolith**: Next.js (App Router) + TypeScript + React + Tailwind CSS
on the front, Supabase (PostgreSQL + Auth) behind. No separate backend, no ORM, no
microservices.

```
User → Next.js application → Supabase (Auth + PostgreSQL)
```

---

## 1. Contents

| Path | Purpose |
| --- | --- |
| `src/app/(app)/` | Protected application pages |
| `src/app/login/` | Login page |
| `src/modules/assets/` | Asset queries and create/edit server actions |
| `src/modules/lifecycle/` | Permitted transitions and the lifecycle change action |
| `src/modules/inspections/` | Inspection queries and action |
| `src/modules/maintenance/` | Maintenance queries and actions |
| `src/modules/audit/` | Audit log writer and queries |
| `src/lib/supabase/` | Browser / server / middleware Supabase clients |
| `supabase/schema.sql` | Tables, indexes, triggers, RLS policies |
| `supabase/seed.sql` | Departments, districts, asset classes and sample assets |

### Pages

```
/login
/dashboard
/assets
/assets/new
/assets/[id]
/assets/[id]/edit
/inspections
/maintenance
/audit-logs
```

---

## 2. Installation

Requires Node.js 18.17 or newer.

```bash
npm install
```

---

## 3. Environment variables

Copy the example file and fill in the two values from your Supabase project
(**Project Settings → API**):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon / publishable key>
```

Only the anon key is used. It is safe in the browser because every table is protected by
Row Level Security. No credentials are hardcoded anywhere in the source.

---

## 4. Supabase setup

1. Create a project at <https://supabase.com>.
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql` and run it.
   This creates the tables, enums, indexes, `updated_at` triggers, the RLS policies, the
   two roles, and a trigger that creates a `profiles` row automatically whenever an auth
   user is created.
3. Under **Authentication → Providers → Email**, make sure *Email* is enabled and
   *Confirm email* is turned **off** (this is an internal system with administrator-issued
   accounts; there is no public registration).

---

## 5. Demo accounts

Create the two demo users in **Authentication → Users → Add user → Create new user**,
ticking *Auto Confirm User*:

| Email | Password | Role |
| --- | --- | --- |
| `admin@gov.example.in` | `Admin@12345` | Administrator |
| `officer@gov.example.in` | `Officer@12345` | Officer |

The profile row is created automatically. To make the first account an Administrator, set
its role once from the SQL Editor:

```sql
update public.profiles
set role_id = (select id from public.roles where name = 'Administrator')
where email = 'admin@gov.example.in';

update public.profiles
set role_id = (select id from public.roles where name = 'Officer')
where email = 'officer@gov.example.in';
```

*(Alternatively, when creating a user you can set the raw user metadata to
`{"full_name": "A. Administrator", "role": "Administrator"}` and the trigger assigns the
role and name for you.)*

### What the roles do

| Action | Administrator | Officer |
| --- | --- | --- |
| View dashboard, registry, inspections, maintenance, audit log | ✓ | ✓ |
| Register a new asset | ✓ | — |
| Edit an asset record | ✓ | — |
| Lifecycle: Planned → Under Construction → Operational ⇄ Under Maintenance | ✓ | ✓ |
| Lifecycle: Retire / Decommission | ✓ | — |
| Record inspections | ✓ | ✓ |
| Create and update maintenance records | ✓ | ✓ |

Asset registration is also enforced in the database: the `insert_assets` RLS policy
requires the Administrator role.

---

## 6. Database setup / seed

After the demo users exist, run `supabase/seed.sql` in the SQL Editor. It inserts four
departments, five districts, six asset classes with their class-specific attribute
schemas, twelve sample assets with attributes, an opening lifecycle event per asset, and
a handful of inspections and maintenance records.

The seed script is idempotent — running it again will not create duplicates.

### Schema

```
roles ── profiles
departments ── asset_classes ── assets ── asset_attributes (JSONB)
districts ──────────────────────┤
                                ├── lifecycle_events
                                ├── inspections
                                ├── maintenance_records
                                └── audit_logs
```

There is deliberately **no** table per asset type. A highway and a hospital are both rows
in `assets`; their differing fields live in `asset_attributes.attributes` (JSONB), and the
form and detail page render them from `asset_classes.attribute_schema`.

Indexes cover the columns the registry filters on: `asset_code`, `name`,
`department_id`, `asset_class_id`, `district_id`, `lifecycle_status`, `condition`.

---

## 7. Local development

```bash
npm run dev       # http://localhost:3000
npm run build     # production build
npm run start     # serve the production build
npm run typecheck # tsc --noEmit
```

Visiting any page while signed out redirects to `/login`; the middleware refreshes the
Supabase session cookie on every request.

---

## 8. Vercel deployment

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import the repository. The framework is detected
   as Next.js; no build-command changes are needed.
3. Under **Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the Production, Preview and Development scopes.
4. Deploy.

There are no localhost assumptions, no server-only secrets and no custom server, so the
application runs unchanged on Vercel.

---

## 9. Lifecycle and condition

Lifecycle and condition are independent. Changing the lifecycle never changes the
condition.

Permitted transitions (enforced in `src/modules/lifecycle/transitions.ts` and checked
again in the server action):

```
Planned            → Under Construction
Under Construction → Operational
Operational        → Under Maintenance
Under Maintenance  → Operational
Operational        → Retired
Retired            → Decommissioned
```

Every change writes a `lifecycle_events` row (date/time, event type, previous status, new
status, user, remarks) and an audit entry. The asset page shows the events as a timeline.

Condition (`Excellent · Good · Fair · Poor · Critical`) changes only when someone edits
the asset or records an inspection with *"Update the asset's recorded condition"* ticked.

---

## 10. Demo workflow

1. Sign in as `admin@gov.example.in`.
2. **Dashboard** — totals, assets by department, recent lifecycle events, maintenance due.
3. **Asset Registry** — search `RT-HW-0002`, or filter by department / class / district /
   lifecycle / condition. Every query, including pagination, runs in PostgreSQL.
4. Open **SH-41 Rajkot–Gondal Road** and read its lifecycle history.
5. **Change Lifecycle** → `Operational` with remarks — the timeline updates.
6. **Add Inspection** → condition `Fair`, tick the condition checkbox — the asset's
   condition follows.
7. **Add Maintenance** → a new record; from `/maintenance` mark it *In Progress*, then
   *Completed* (the end date is filled in automatically).
8. Return to the asset — lifecycle history, inspections and maintenance all reflect the
   work.
9. **Audit Log** — every one of those steps is listed, with user, timestamp, asset and
   what changed. Audit rows have no UPDATE or DELETE policy, so nobody can alter them.

Sign in as `officer@gov.example.in` to see the restrictions: no *Register asset* button,
no *Edit*, and `Retired` is absent from the lifecycle options.

---

## 11. Notes and limitations

This is an MVP, deliberately scoped:

- No citizen-facing functionality.
- No photo or document uploads.
- No Departments / Asset Classes / Users management screens — reference data is seeded in
  SQL.
- Asset classes and their attribute schemas are edited directly in the `asset_classes`
  table; the UI reads `attribute_schema` and renders `text`, `number`, `boolean` and
  `select` fields from it.
