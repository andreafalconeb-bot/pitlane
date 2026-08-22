-- ============================================================
-- PITLANE — Migration 008
-- Tracks when km_current was last verified so the app can know when
-- it's time to ask the owner for a fresh odometer reading again
-- (km_check_freq already existed in 001 but nothing used it — there
-- was no timestamp to measure "due" against). Logging a service (or
-- a direct km update) resets this, postponing the next ask.
-- ============================================================

alter table public.vehicle_ownership
  add column if not exists km_current_updated_at timestamptz default now();
