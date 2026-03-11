# Fastbreak AI Event Dashboard - Demo Application Branded as Forecheck AI

A sports event management dashboard for organizing, scheduling, and tracking events across multiple venues and sport types.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Auth & Database | Supabase (Postgres + Row Level Security) |
| Styling | Tailwind CSS, shadcn/ui (Radix UI primitives) |
| Forms & Validation | react-hook-form + Zod |
| Toasts | Sonner |
| Icons | Lucide React |

---

## Architecture

### Scaffolded from the Supabase starter template

The `with-supabase` template scaffolds a correct, production-hardened auth flow: middleware-level session refresh, OAuth callback handler, password reset flow, and typed server-side client. Starting from it meant the entire auth layer was solved on day one — all build time went toward the event management problem and UI feel of the application.

That said, it required testing and refactoring to ensure all data reads happen in Server Components via direct Supabase queries and all writes go through `"use server"` actions.

### Server Actions instead of API routes

All operations (create, update, delete) are co-located with the route as `"use server"` functions in `app/dashboard/events/actions.ts`. `/api/*` route handlers would have introduced a client→server HTTP boundary, required a `fetch()` call on the client, and produced a response shape that needs to be defined and kept in sync on both ends. Server Actions collapse that to a direct function call with full TypeScript inference end-to-end — no separate API contract to document or maintain.

Every server action returns an `ActionResult<T>` union — `{ success: true, data }` or `{ success: false, error }` defined in `lib/actions.ts`. Auth and event mutations use the same shape, so the client always has a uniform way to handle feedback and trigger toasts.

### Two-layer authentication

Authentication is enforced at two layers:

1. **Middleware** (`middleware.ts` → `lib/supabase/proxy.ts`): Every request passes through `updateSession`, which refreshes the Supabase JWT from the session cookie and redirects unauthenticated users to `/auth/login`. This is the primary gate.
2. **Server Components**: Pages call `supabase.auth.getClaims()` and `redirect()` directly as a secondary guard.

Middleware alone could be bypassed if a request slipped past it (e.g., a misconfigured route matcher). Server Components alone require every page to independently redirect, which is fragile to maintain. Together they form defense-in-depth — this is the pattern the Supabase SSR docs recommend precisely because either layer alone has known failure modes.

All database access uses the server-side Supabase client (`lib/supabase/server.ts`), which reads the session from cookies. There is no client-side Supabase data access — every read and write is authenticated server-side.

### RLS for per-user data isolation

Each user's events are private to them. This is enforced at the Postgres RLS layer with a `SELECT` policy tied to `auth.uid()` rather than filtered in application code.

The app still adds a `created_by` filter to every query as a secondary defense, but the authoritative isolation guarantee is in the policy. When I was testing the auth flow without isolation, I was able to perform CRUD operations on another user's account — that's what prompted moving the isolation rule to the database layer rather than relying solely on application code.

### Soft deletes at the RLS layer

All tables carry a `deleted_at` column. Deleting a record sets this timestamp; a `deleted_at IS NULL` guard in each Postgres RLS policy filters deleted rows out transparently. Application code never needs to remember to exclude deleted records — and the history is preserved rather than permanently gone.

### URL-driven filter state

The sport chip filters, date picker, free-text search, and list/calendar view toggle are all stored in URL search params — there is no global state library. Filters survive a page reload, are shareable as a link, and Next.js re-runs the Server Component data fetch automatically when the URL changes. No manual cache invalidation or refetch trigger needed.

Additionally, the chip-style UI allows for quick filtering by one or more sports.

### Venue catalog

The `venues` table is event-scoped — each row belongs to one event. But venues in the real world are reusable. Without a catalog, users re-type the same name and address on every event form. A venue like "The Ice House Sports Complex, 123 Main St" shouldn't need to be typed for every event held there.

The `venue_catalog` table is the shared registry. New venues are auto-saved to it on creation, and future event forms surface catalog entries as suggestions — common venues are a single selection rather than a re-typed form fill. The `venue_catalog_id` FK on `venues` links the two tables while keeping event-level venue rows independent.

### Client-side conflict detection

The `EventCalendar` timeline view computes scheduling conflicts without an extra database query. `eventsOverlapAtVenue()` is a pure function wrapped in `useMemo` that checks time overlap plus shared venue name against the already-fetched event data. An amber warning badge appears automatically on any conflicting event.

The event data is already fetched for the current view — the overlap check adds zero latency and zero load to the database. The tradeoff is that conflicts are only shown for events currently visible in the filter, which is acceptable since this is a convenience warning, not a hard constraint.

### Two event views

The dashboard offers two ways to look at the same event data — built around the questions a sports event organizer may ask:

- **Day timeline** (`EventCalendar`) — groups events by date, shows duration, surfaces venue conflicts. Conflicts are easy to miss in a flat sorted list.
- **Month grid** (`EventCalendarGrid`) — full calendar with per-day event count badges; clicking a day applies a date filter. A list doesn't answer "how many events do I have this week", holistically — the month grid gives an immediate visual answer and lets you drill down.

### Forced dark mode

The Fastbreak brand color palette — Galaxy Black `#011627`, Bright Aqua `#17F2E3`, Electric Sky `#49CBE8` — is designed for dark backgrounds. The accents lose contrast and the brand identity breaks down on a white or gray background. Forcing dark mode (`forcedTheme="dark"`, `enableSystem={false}`) ensures the app always looks the way it was designed to look, regardless of the user's OS preference.

### shadcn/ui

shadcn/ui components are copied into the project rather than imported from a package — the component source is in the repo, readable, and fully customizable without fighting an external library.. The components are built on Radix UI primitives, which handles keyboard navigation, focus management, ARIA roles, and screen reader semantics correctly. Accessible interactive elements (dialogs, dropdowns, checkboxes, alerts) without building that infrastructure from scratch.

### React Hook Form + Zod

The event form has dynamic venue rows — the number of venue fields changes at runtime as the user adds and removes venues. React Hook Form's `useFieldArray` manages this naturally without triggering unnecessary re-renders. Zod provides a schema that validates the same shape on both the client (instant feedback) and the server action (authoritative check). A single schema definition covers both layers.

---

## Database Schema

```
sport_types       — seeded lookup table (12 sports); soft-deletable
events            — core table; owned by created_by (auth.uid()); RLS restricts SELECT to own rows
venues            — event-scoped venue rows; linked to venue_catalog via FK (nullable)
venue_catalog     — shared registry of named venues; auto-populated on new venue creation
```

All tables carry `deleted_at timestamptz` for soft deletion. RLS policies on all tables include `deleted_at IS NULL` guards.

**RLS evolution across migrations:**
- `20260309_initial_schema.sql` — core tables, initial RLS (creator can write; all can read)
- `20260310_venue_catalog.sql` — adds `venue_catalog` table
- `20260311_soft_delete.sql` — adds `deleted_at` to all tables; updates SELECT policies
- `20260312_add_event_duration.sql` — adds `duration_minutes` column to `events`
- `20260313_restrict_events_select_own.sql` — tightens SELECT to per-user isolation (`created_by = auth.uid()`)

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### Steps

1. **Clone the repo**

   ```bash
   git clone <repo-url>
   cd fastbreak
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and fill in your Supabase project values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
   ```

4. **Run database migrations**

   In your Supabase project's SQL editor, run the migration files in order from `supabase/migrations/`:

   ```
   20260309_initial_schema.sql
   20260310_venue_catalog.sql
   20260311_soft_delete.sql
   20260312_add_event_duration.sql
   20260313_restrict_events_select_own.sql
   ```

   Alternatively, use the Supabase CLI: `supabase db push`

5. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The root route redirects to `/dashboard` if authenticated, or `/auth/login` if not.

---

## License

Created by Vincenzo Reo as Forecheck AI for Fastbreak AI.
