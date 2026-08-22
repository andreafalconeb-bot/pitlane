-- ============================================================
-- PITLANE — Migration 004
-- claim_vehicle() hardcoded plan='basic' for every claimed vehicle
-- (transferred / pre-registered / recovered from decommission).
-- Registration now asks the owner to pick a plan, so the RPC needs
-- to accept and use it instead.
-- ============================================================

-- CREATE OR REPLACE can't change a function's argument list — it would
-- just add a second overload and leave the old 2-arg version callable.
-- Drop it explicitly first.
drop function if exists public.claim_vehicle(text, text);

create function public.claim_vehicle(
  p_vin text,
  p_code text default null,
  p_plan text default 'basic'
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
    values (p_vin, auth.uid(), coalesce(p_plan, 'basic'));

  if wv is not null and (p_code is null or wv.invite_code = p_code) then
    update public.workshop_vehicles set status = 'active' where id = wv.id;
  end if;
end;
$$;

grant execute on function public.claim_vehicle(text, text, text) to authenticated;
