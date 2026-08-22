-- ============================================================
-- PITLANE — Migration 003
-- Fixes infinite RLS recursion introduced in 002.
--
-- "Workshop sees assigned vehicles" (on vehicles) queried
-- service_history to check assignment. service_history's own
-- "Owner sees full history" policy queries vehicles to check
-- ownership. Reading `vehicles` therefore re-entered `vehicles`
-- RLS through that cycle, which Postgres rejects with
-- "infinite recursion detected in policy for relation vehicles"
-- — surfaced by PostgREST as 400/500 on plain vehicle reads.
--
-- Fix: move the cross-table check into a SECURITY DEFINER
-- function. Its internal queries run as the function owner
-- (table owner), which bypasses RLS entirely by default, so the
-- cycle never re-enters `vehicles` RLS.
-- ============================================================

create or replace function public.workshop_can_see_vehicle(p_vin text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.workshop_vehicles wv
    join public.workshops w on w.id = wv.workshop_id
    where wv.vin = p_vin and w.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.service_history sh
    join public.workshops w on w.id = sh.workshop_id
    where sh.vin = p_vin and w.owner_id = auth.uid()
  );
$$;

drop policy if exists "Workshop sees assigned vehicles" on public.vehicles;
create policy "Workshop sees assigned vehicles" on public.vehicles
  for select using (public.workshop_can_see_vehicle(vin));
