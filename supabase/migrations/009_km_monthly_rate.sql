-- ============================================================
-- PITLANE — Migration 009
-- km_monthly has existed in vehicle_ownership since 001 but the app
-- never asked for it or used it. It's the primary input for the km
-- projection (declared by the owner at registration, adjustable
-- later) — not something inferred from sparse history, which is only
-- useful as a rectification hint once real data exists.
--
-- Also fixes a real gap while touching this function: claim_vehicle
-- never set km_current on the new ownership row, so a claimed
-- vehicle silently started at 0 km.
-- ============================================================

drop function if exists public.claim_vehicle(text, text, text);

create function public.claim_vehicle(
  p_vin text,
  p_code text default null,
  p_plan text default 'basic',
  p_km_current int default 0,
  p_km_monthly int default 0
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

  insert into public.vehicle_ownership (vin, owner_id, plan, km_current, km_monthly, km_current_updated_at)
    values (p_vin, auth.uid(), coalesce(p_plan, 'basic'), coalesce(p_km_current, 0), coalesce(p_km_monthly, 0), now());

  if wv is not null and (p_code is null or wv.invite_code = p_code) then
    update public.workshop_vehicles set status = 'active' where id = wv.id;
  end if;
end;
$$;

grant execute on function public.claim_vehicle(text, text, text, int, int) to authenticated;
