# IPChat

IPChat is a Vercel-ready Next.js workspace chat application. The original
CONNECT+24 room chat has been migrated into a secure SaaS foundation with
Supabase Auth, Postgres Row Level Security, and Supabase Realtime.

## Architecture

```text
Browser
  └─ Next.js App Router UI
       ├─ Supabase Auth (email/password + verification)
       ├─ Supabase Postgres (workspaces, memberships, messages)
       └─ Supabase Realtime (Postgres changes for messages)
Vercel
  └─ Next.js server/runtime and static assets
```

Vercel serverless functions are not used as a persistent WebSocket server.
Realtime is provided by Supabase. File attachments, billing, invitations, and
transactional email require the corresponding managed service configuration and
are intentionally not represented as fake local functionality.

## Local development

Requirements: Node.js 20+ and a Supabase project.

```bash
npm install
cp .env.example .env.local
# Add the Supabase URL and anon key to .env.local
npx supabase db push --file supabase/schema.sql
npm run dev
```

If the Supabase CLI is unavailable, run `supabase/schema.sql` in the Supabase
SQL Editor. In Authentication settings, enable email/password and configure
the Site URL plus redirect URLs for the local and Vercel domains.

## Environment variables

| Variable | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase browser anon key; protected by RLS |

Never put a Supabase service-role key or other secret in a `NEXT_PUBLIC_`
variable. `.env.local` is ignored and `.env.example` contains placeholders only.

## Vercel deployment

1. Push the repository to GitHub without `.env.local`.
2. Import it into Vercel. The framework preset should be **Next.js**.
3. Add the two variables from `.env.example` in Vercel for Preview and
   Production environments.
4. Deploy and add the Vercel URL to Supabase Authentication URL settings.
5. Run `supabase/schema.sql` once in the Supabase SQL Editor and verify that
   Realtime includes `public.messages`.

Vercel automatically uses `npm run build`; no Render, Railway, VPS, or custom
backend is required.

## Implemented now

- Email/password registration and login with Supabase Auth.
- Email verification-compatible signup flow.
- Supabase-backed workspace and membership model.
- RLS-protected workspace messages.
- Realtime message updates through Supabase Realtime.
- Responsive dashboard/chat shell with liquid-glass surfaces.
- Light, dark, and system theme selection.
- Secure response headers and environment-safe configuration.

## Manual configuration and limitations

- Password recovery UI, team invitations, attachment storage, typing/read
  presence, billing, usage metering, and admin moderation still need a chosen
  provider/workflow before production implementation.
- The current onboarding lets an authenticated user create a workspace and
  join it as owner. Production invitations should be implemented through a
  server-side, expiring token flow.
- Supabase email provider configuration and production SMTP are external setup.
- Apply database migrations through a controlled Supabase deployment process;
  do not use open/test-mode policies.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```
