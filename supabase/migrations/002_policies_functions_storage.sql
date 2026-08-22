-- ============================================================
-- PITLANE — Migration 002
-- Fixes RLS gaps in 001 that block core app writes, adds the
-- fidelity-points automation, custom-item cap, and document
-- storage. Run once in the Supabase SQL Editor (or `supabase db
-- push`) against the project the app points to.
-- ============================================================

-- ── FIX: vehicles had no INSERT policy at all ──────────────────
-- Without this, RLS silently blocks every vehicle registration
-- (client self-register AND workshop pre-register), because
-- Postgres RLS defaults to deny when a command has no matching
-- policy.
create policy "Authenticated users insert vehicles" on public.vehicles
  for insert with check (auth.uid() is not null);

-- ── FIX: the original UPDATE policy's WITH CHECK compared each
-- column to itself (`vin = vin and brand = brand ...`), which is
-- always true and enforced nothing. Real immutability needs a
-- trigger that can see OLD vs NEW.
create or replace function public.enforce_vehicle_immutable_fields()
returns trigger language plpgsql as $$
begin
  if new.vin <> old.vin then
    raise exception 'vin is immutable';
  end if;
  if new.brand <> old.brand then
    raise exception 'brand is immutable';
  end if;
  if new.model <> old.model then
    raise exception 'model is immutable';
  end if;
  if new.year <> old.year then
    raise exception 'year is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists vehicle_immutable_fields_trigger on public.vehicles;
create trigger vehicle_immutable_fields_trigger
  before update on public.vehicles
  for each row execute function public.enforce_vehicle_immutable_fields();

-- Replace the no-op WITH CHECK with a real one (ownership only —
-- field immutability is now handled by the trigger above).
drop policy if exists "Owner updates own vehicles" on public.vehicles;
create policy "Owner updates own vehicles" on public.vehicles
  for update using (auth.uid() = current_owner)
  with check (auth.uid() = current_owner);

-- Workshops need to be able to update a vehicle they pre-register
-- (e.g. plate correction) before it has an owner.
create policy "Workshop updates unclaimed vehicles" on public.vehicles
  for update using (
    current_owner is null
    and exists (select 1 from public.profiles where id = auth.uid() and role in ('taller_free','taller_paid','master'))
  )
  with check (current_owner is null);

-- ── FIX: vehicle_ownership had no INSERT/UPDATE policy ─────────
create policy "Owner inserts own ownership" on public.vehicle_ownership
  for insert with check (auth.uid() = owner_id);
create policy "Owner updates own ownership" on public.vehicle_ownership
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ── FIX: vehicle_documents had no UPDATE policy ─────────────────
-- Needed to mark the previous version active=false when a new one
-- is uploaded (documents are never deleted, per business rules).
create policy "Owner updates own documents" on public.vehicle_documents
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ── FIX: workshop_vehicles had no policy letting the vehicle
-- owner accept a pending pre-registration ─────────────────────
create policy "Vehicle owner accepts assignment" on public.workshop_vehicles
  for update using (
    exists (select 1 from public.vehicles v where v.vin = workshop_vehicles.vin and v.current_owner = auth.uid())
  )
  with check (
    exists (select 1 from public.vehicles v where v.vin = workshop_vehicles.vin and v.current_owner = auth.uid())
  );

-- ── FIX: dictionary had no UPDATE policy for master review ─────
create policy "Master reviews dictionary" on public.dictionary
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );

-- ── CUSTOM MAINTENANCE: enforce max 5 per vehicle server-side ──
-- (mirrors the client-side check; this is the real enforcement).
create or replace function public.enforce_custom_maint_limit()
returns trigger language plpgsql as $$
declare
  current_count int;
begin
  select count(*) into current_count from public.custom_maint where vin = new.vin;
  if current_count >= 5 then
    raise exception 'max 5 custom maintenance items per vehicle';
  end if;
  return new;
end;
$$;

drop trigger if exists custom_maint_limit_trigger on public.custom_maint;
create trigger custom_maint_limit_trigger
  before insert on public.custom_maint
  for each row execute function public.enforce_custom_maint_limit();

-- ── FIDELITY POINTS: SECURITY DEFINER helper ────────────────────
-- Clients/workshops cannot write points_log or workshops.points
-- directly (by design — only this trusted function can). It caps
-- the 'service_approved' reason at 200 lifetime points, matching
-- the rule in the master brief; other reasons are uncapped.
create or replace function public.award_points(
  p_workshop_id uuid,
  p_points int,
  p_reason text,
  p_ref_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  already_earned int;
  awarded int := p_points;
begin
  if p_reason = 'service_approved' then
    select coalesce(sum(points), 0) into already_earned
    from public.points_log
    where workshop_id = p_workshop_id and reason = 'service_approved';
    if already_earned >= 200 then
      awarded := 0;
    elsif already_earned + p_points > 200 then
      awarded := 200 - already_earned;
    end if;
  end if;

  if awarded <> 0 then
    insert into public.points_log (workshop_id, points, reason, ref_id)
    values (p_workshop_id, awarded, p_reason, p_ref_id);

    update public.workshops set points = points + awarded, updated_at = now()
    where id = p_workshop_id;
  end if;
end;
$$;

-- Pre-register: +5 when a workshop creates a workshop_vehicles row.
create or replace function public.on_workshop_vehicle_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.award_points(new.workshop_id, 5, 'pre_register', new.vin);
  return new;
end;
$$;

drop trigger if exists workshop_vehicle_insert_points_trigger on public.workshop_vehicles;
create trigger workshop_vehicle_insert_points_trigger
  after insert on public.workshop_vehicles
  for each row execute function public.on_workshop_vehicle_insert();

-- Client accepts: +20 when workshop_vehicles.status flips to 'active'.
create or replace function public.on_workshop_vehicle_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and old.status <> 'active' then
    perform public.award_points(new.workshop_id, 20, 'client_accepted', new.vin);
  end if;
  return new;
end;
$$;

drop trigger if exists workshop_vehicle_accepted_points_trigger on public.workshop_vehicles;
create trigger workshop_vehicle_accepted_points_trigger
  after update on public.workshop_vehicles
  for each row execute function public.on_workshop_vehicle_accepted();

-- Service approved: +5 (capped 200 lifetime), +3 bonus if approved
-- without modification (modified_desc/modified_price both null).
create or replace function public.on_service_history_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status <> 'approved' and new.workshop_id is not null then
    perform public.award_points(new.workshop_id, 5, 'service_approved', new.id::text);
    if new.modified_desc is null and new.modified_price is null then
      perform public.award_points(new.workshop_id, 3, 'service_approved_no_mod', new.id::text);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists service_history_status_points_trigger on public.service_history;
create trigger service_history_status_points_trigger
  after update on public.service_history
  for each row execute function public.on_service_history_status_change();

-- Dictionary approved: +50 (uncapped) to the proposer's workshop.
create or replace function public.on_dictionary_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ws_id uuid;
begin
  if new.status = 'approved' and old.status <> 'approved' then
    select id into ws_id from public.workshops where owner_id = new.proposed_by limit 1;
    if ws_id is not null then
      perform public.award_points(ws_id, 50, 'dictionary_approved', new.id::text);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dictionary_status_points_trigger on public.dictionary;
create trigger dictionary_status_points_trigger
  after update on public.dictionary
  for each row execute function public.on_dictionary_status_change();

-- ── STORAGE: vehicle documents bucket ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('vehicle-documents', 'vehicle-documents', false, 10485760)
on conflict (id) do nothing;

-- App uploads to `${auth.uid()}/${vin}/${filename}` — the owner
-- writes only under their own prefix; any authenticated profile
-- can read (matches the "all profiles can view documents" rule).
create policy "Owner uploads own document objects" on storage.objects
  for insert with check (
    bucket_id = 'vehicle-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Authenticated reads document objects" on storage.objects
  for select using (
    bucket_id = 'vehicle-documents' and auth.uid() is not null
  );

-- ── FIX: vehicles had no way for a non-owner to look up a vehicle
-- by VIN before claiming it (transfer, pre-registered by a
-- workshop, or decommissioned). Needed for the "already exists /
-- eres afortunado" registration flow and for transfer claims.
-- Deliberately scoped to non-active-owned rows only — an actively
-- owned vehicle stays invisible to everyone but its owner/master.
create policy "Find claimable vehicles by VIN" on public.vehicles
  for select using (
    auth.uid() is not null and (status <> 'active' or current_owner is null)
  );

-- Workshops need to see basic details (brand/model/plate) of vehicles
-- they're assigned to or have serviced, to build their own dashboard.
create policy "Workshop sees assigned vehicles" on public.vehicles
  for select using (
    exists (
      select 1 from public.workshop_vehicles wv
      join public.workshops w on w.id = wv.workshop_id
      where wv.vin = vehicles.vin and w.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.service_history sh
      join public.workshops w on w.id = sh.workshop_id
      where sh.vin = vehicles.vin and w.owner_id = auth.uid()
    )
  );

-- ── CLAIM VEHICLE: single atomic entry point for taking ownership
-- of an existing vehicle row (new self-registration still goes
-- through a plain INSERT — this is only for vehicles that already
-- exist: decommissioned, transferred, or pre-registered by a
-- workshop). Runs as SECURITY DEFINER so it can update the prior
-- owner's vehicle_ownership row and the workshop_vehicles status,
-- which the calling user has no direct RLS rights to touch.
create or replace function public.claim_vehicle(
  p_vin text,
  p_code text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  wv record;
begin
  select * into v from public.vehicles where vin = p_vin;
  if v is null then
    raise exception 'vehicle not found';
  end if;

  if v.current_owner = auth.uid() and v.status = 'active' then
    return;
  end if;

  if v.status = 'transferred' then
    if p_code is null or v.transfer_code is null or v.transfer_code <> p_code then
      raise exception 'invalid or missing transfer code';
    end if;
  elsif v.status = 'active' and v.current_owner is not null then
    raise exception 'vehicle already has an active owner';
  end if;

  select * into wv from public.workshop_vehicles
    where vin = p_vin and status = 'pending'
    order by created_at desc limit 1;

  update public.vehicle_ownership set ended_at = now()
    where vin = p_vin and ended_at is null;

  update public.vehicles
    set current_owner = auth.uid(), status = 'active', transfer_code = null
    where vin = p_vin;

  insert into public.vehicle_ownership (vin, owner_id, plan)
    values (p_vin, auth.uid(), 'basic');

  if wv is not null and (p_code is null or wv.invite_code = p_code) then
    update public.workshop_vehicles set status = 'active' where id = wv.id;
  end if;
end;
$$;

grant execute on function public.claim_vehicle(text, text) to authenticated;
