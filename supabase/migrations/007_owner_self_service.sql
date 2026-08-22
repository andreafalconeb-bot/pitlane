-- ============================================================
-- PITLANE — Migration 007
-- Owners need to log a maintenance job they did themselves (or paid
-- an unaffiliated mechanic for) — not every service goes through a
-- registered workshop's preload flow. service_history only had an
-- INSERT policy for workshops; this adds one for the vehicle owner,
-- scoped to rows with no workshop_id so self-reported entries stay
-- distinguishable from workshop-sourced ones.
-- ============================================================

create policy "Owner logs own service" on public.service_history
  for insert with check (
    workshop_id is null
    and exists (
      select 1 from public.vehicles v
      where v.vin = service_history.vin and v.current_owner = auth.uid()
    )
  );
