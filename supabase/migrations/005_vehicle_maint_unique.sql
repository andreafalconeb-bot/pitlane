-- ============================================================
-- PITLANE — Migration 005
-- vehicle_maint had no unique constraint on (vin, catalog_id), so
-- toggling a catalog item's alarm (configurable plan) can't safely
-- upsert — it would either always insert a duplicate row or need a
-- manual select-then-insert-or-update. Table has never been written
-- to yet (no app code did until now), so this is safe to add.
-- ============================================================

alter table public.vehicle_maint
  add constraint vehicle_maint_vin_catalog_unique unique (vin, catalog_id);
