-- ============================================================
-- PITLANE — Migration 006
-- Per-vehicle override of a catalog item's km/month interval (e.g.
-- synthetic oil lasting 10,000km vs. mineral oil at 5,000km on
-- another car). Available on every plan — it's a fact about the
-- vehicle, not a plan privilege. NULL means "use the catalog default".
-- ============================================================

alter table public.vehicle_maint
  add column if not exists km_interval_override int,
  add column if not exists month_interval_override int;
