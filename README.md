# PITLANE
MAD 4 Performance · Vehicle Maintenance Platform

## Deploy

Cloudflare Pages build settings:
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (never the service key — it must stay server-side only).

Before the app works end to end, run `supabase/migrations/002_policies_functions_storage.sql` once against the Supabase project (SQL Editor) — it fixes RLS gaps that block vehicle registration and adds the fidelity-points automation and document storage bucket.
