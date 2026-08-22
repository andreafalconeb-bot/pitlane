-- ============================================================
-- PITLANE — Supabase Schema
-- MAD 4 Performance · Vehicle Maintenance Platform
-- Run in Supabase SQL Editor or as migration
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  role        text not null check (role in ('client','taller_free','taller_paid','master')),
  name        text not null,
  phone       text,
  email       text,
  avatar_url  text,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users see own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

-- ── WORKSHOPS ────────────────────────────────────────────────
create table public.workshops (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references public.profiles not null,
  name        text not null,
  address     text,
  phone       text,
  tier        text not null default 'free' check (tier in ('free','paid')),
  points      int not null default 0,
  level       text not null default 'basico'
    check (level in ('basico','tecnico','especialista','experto','master')),
  active      boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.workshops enable row level security;
create policy "Workshop owner full access" on public.workshops
  for all using (auth.uid() = owner_id);
create policy "Master sees all workshops" on public.workshops
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );

-- ── VEHICLES ─────────────────────────────────────────────────
-- VIN is the permanent primary key. Never changes. Never deleted.
create table public.vehicles (
  vin             text primary key,
  plate           text,
  brand           text not null,
  model           text not null,
  year            int not null check (year >= 1900 and year <= 2100),
  color           text,
  serial_motor    text,
  oil             text,
  photo_url       text,
  status          text not null default 'active'
    check (status in ('active','transferred','decommissioned')),
  current_owner   uuid references public.profiles,
  transfer_code   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.vehicles enable row level security;
create policy "Owner sees own vehicles" on public.vehicles
  for select using (auth.uid() = current_owner);
create policy "Owner updates own vehicles" on public.vehicles
  for update using (auth.uid() = current_owner)
  with check (
    -- Owner cannot change VIN, brand, model, year
    vin = vin and brand = brand and model = model and year = year
  );
create policy "Master sees all vehicles" on public.vehicles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'master')
  );

-- ── VEHICLE OWNERSHIP ────────────────────────────────────────
create table public.vehicle_ownership (
  id            uuid primary key default gen_random_uuid(),
  vin           text not null references public.vehicles,
  owner_id      uuid not null references public.profiles,
  plan          text not null default 'basic'
    check (plan in ('basic','advanced','configurable')),
  km_current    int not null default 0,
  km_monthly    int not null default 0,
  km_check_freq text not null default 'monthly'
    check (km_check_freq in ('never','monthly','quarterly')),
  started_at    timestamptz default now(),
  ended_at      timestamptz
);
alter table public.vehicle_ownership enable row level security;
create policy "Owner sees own ownerships" on public.vehicle_ownership
  for select using (auth.uid() = owner_id);

-- ── MAINTENANCE CATALOG ──────────────────────────────────────
create table public.maint_catalog (
  id            text primary key,
  category      text not null,
  label         text not null,
  km_interval   int,
  month_interval int not null,
  mode          text not null default 'both'
    check (mode in ('km','time','both')),
  criticality   text not null check (criticality in ('alta','media','baja')),
  plan_basic    boolean not null default false,
  plan_advanced boolean not null default true,
  plan_config   boolean not null default true,
  sort_order    int default 0
);
-- Public read access for catalog
alter table public.maint_catalog enable row level security;
create policy "Anyone reads catalog" on public.maint_catalog
  for select using (true);

-- ── VEHICLE MAINTENANCE STATE ────────────────────────────────
create table public.vehicle_maint (
  id            uuid primary key default gen_random_uuid(),
  vin           text not null references public.vehicles,
  catalog_id    text references public.maint_catalog,
  last_km       int,
  last_date     date,
  alarm_on      boolean not null default true,
  paused        boolean not null default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.vehicle_maint enable row level security;
create policy "Owner manages vehicle maint" on public.vehicle_maint
  for all using (
    exists (
      select 1 from public.vehicles v
      where v.vin = vehicle_maint.vin and v.current_owner = auth.uid()
    )
  );

-- ── CUSTOM MAINTENANCE ITEMS ─────────────────────────────────
-- Max 5 per vehicle enforced in Edge Function
create table public.custom_maint (
  id            uuid primary key default gen_random_uuid(),
  vin           text not null references public.vehicles,
  owner_id      uuid not null references public.profiles,
  label         text not null,
  category      text,
  km_interval   int,
  month_interval int,
  mode          text check (mode in ('km','time','both')),
  criticality   text check (criticality in ('alta','media','baja')),
  alarm_on      boolean not null default true,
  last_km       int,
  last_date     date,
  created_at    timestamptz default now()
);
alter table public.custom_maint enable row level security;
create policy "Owner manages custom items" on public.custom_maint
  for all using (auth.uid() = owner_id);

-- ── SERVICE HISTORY ──────────────────────────────────────────
-- Immutable once approved. Never deleted.
create table public.service_history (
  id            uuid primary key default gen_random_uuid(),
  vin           text not null references public.vehicles,
  workshop_id   uuid references public.workshops,
  workshop_name text not null,
  date          date not null,
  km_at_service int,
  description   text not null,
  price         numeric(10,2),
  receipt_url   text,
  status        text not null default 'pending'
    check (status in ('pending','approved','modified','rejected')),
  modified_price numeric(10,2),
  modified_desc  text,
  approved_at   timestamptz,
  created_at    timestamptz default now()
);
alter table public.service_history enable row level security;
-- Owner sees full history with prices
create policy "Owner sees full history" on public.service_history
  for select using (
    exists (
      select 1 from public.vehicles v
      where v.vin = service_history.vin and v.current_owner = auth.uid()
    )
  );
-- Workshop sees own services (price visible), others masked
create policy "Workshop sees own services" on public.service_history
  for select using (
    exists (
      select 1 from public.workshops w
      where w.id = service_history.workshop_id and w.owner_id = auth.uid()
    )
  );
-- Workshop preloads services
create policy "Workshop inserts services" on public.service_history
  for insert with check (
    exists (
      select 1 from public.workshops w
      where w.id = service_history.workshop_id and w.owner_id = auth.uid()
    )
  );
-- Owner approves/rejects
create policy "Owner updates service status" on public.service_history
  for update using (
    exists (
      select 1 from public.vehicles v
      where v.vin = service_history.vin and v.current_owner = auth.uid()
    )
  );

-- ── VEHICLE DOCUMENTS ────────────────────────────────────────
-- Never deleted. Old version marked active=false.
create table public.vehicle_documents (
  id            uuid primary key default gen_random_uuid(),
  vin           text not null references public.vehicles,
  owner_id      uuid not null references public.profiles,
  doc_type      text check (doc_type in ('carnet','titulo','otro')),
  file_url      text not null,
  file_name     text,
  mime_type     text,
  file_size_kb  int,
  active        boolean not null default true,
  created_at    timestamptz default now()
);
alter table public.vehicle_documents enable row level security;
-- Only owner uploads
create policy "Owner uploads documents" on public.vehicle_documents
  for insert with check (auth.uid() = owner_id);
-- All profiles can view (workshop, master)
create policy "All see documents" on public.vehicle_documents
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.profiles p where p.id = auth.uid()
      and p.role in ('taller_free','taller_paid','master')
    )
  );

-- ── WORKSHOP-VEHICLE ASSIGNMENTS ────────────────────────────
create table public.workshop_vehicles (
  id            uuid primary key default gen_random_uuid(),
  workshop_id   uuid not null references public.workshops,
  vin           text not null references public.vehicles,
  status        text not null default 'pending'
    check (status in ('pending','invited','active')),
  invite_code   text,
  created_at    timestamptz default now(),
  unique(workshop_id, vin)
);
alter table public.workshop_vehicles enable row level security;
create policy "Workshop manages own assignments" on public.workshop_vehicles
  for all using (
    exists (
      select 1 from public.workshops w
      where w.id = workshop_vehicles.workshop_id and w.owner_id = auth.uid()
    )
  );

-- ── POINTS LOG ──────────────────────────────────────────────
create table public.points_log (
  id            uuid primary key default gen_random_uuid(),
  workshop_id   uuid not null references public.workshops,
  points        int not null,
  reason        text not null,
  ref_id        text,
  created_at    timestamptz default now()
);
alter table public.points_log enable row level security;
create policy "Workshop sees own points" on public.points_log
  for select using (
    exists (
      select 1 from public.workshops w
      where w.id = points_log.workshop_id and w.owner_id = auth.uid()
    )
  );

-- ── DICTIONARY ───────────────────────────────────────────────
create table public.dictionary (
  id            uuid primary key default gen_random_uuid(),
  term          text not null,
  definition    text not null,
  proposed_by   uuid references public.profiles,
  status        text not null default 'pending'
    check (status in ('pending','approved','rejected')),
  reviewed_by   uuid references public.profiles,
  created_at    timestamptz default now()
);
alter table public.dictionary enable row level security;
create policy "All read approved terms" on public.dictionary
  for select using (status = 'approved' or proposed_by = auth.uid());
create policy "Authenticated proposes" on public.dictionary
  for insert with check (auth.uid() is not null);

-- ── SEED: MAINTENANCE CATALOG ────────────────────────────────
insert into public.maint_catalog (id, category, label, km_interval, month_interval, mode, criticality, plan_basic, plan_advanced, plan_config, sort_order) values
-- MOTOR
('oil', 'Motor','Cambio de aceite + filtro de aceite',5000,6,'both','alta',true,true,true,1),
('air', 'Motor','Filtro de aire motor',15000,18,'both','media',true,true,true,2),
('fuf', 'Motor','Filtro de combustible',30000,24,'both','media',true,true,true,3),
('pol', 'Motor','Filtro de habitáculo',15000,12,'both','baja',true,true,true,4),
('spk', 'Motor','Bujías',30000,36,'both','alta',false,true,true,5),
('tmg', 'Motor','Correa / cadena de distribución',50000,60,'both','alta',true,true,true,6),
('blt', 'Motor','Correas accesorios (poly-v)',60000,60,'both','alta',false,true,true,7),
('wtp', 'Motor','Bomba de agua',60000,60,'both','alta',false,true,true,8),
('pcv', 'Motor','Válvula PCV',40000,48,'both','media',false,true,true,9),
('inj', 'Motor','Limpieza inyectores (equipo externo)',40000,48,'both','media',false,true,true,10),
('cbl', 'Motor','Limpieza sistema combustible (aditivo)',5000,6,'both','media',true,true,true,11),
-- TRANSMISION
('taf','Transmision','Aceite transmisión automática',40000,48,'both','alta',true,true,true,20),
('tmf','Transmision','Aceite transmisión manual',40000,48,'both','alta',true,true,true,21),
('dfl','Transmision','Aceite diferencial delantero',40000,48,'both','alta',true,true,true,22),
('dfr','Transmision','Aceite diferencial trasero',40000,48,'both','alta',true,true,true,23),
('tcs','Transmision','Aceite caja de transferencia',40000,48,'both','media',true,true,true,24),
('clu','Transmision','Revisión de embrague',60000,60,'both','alta',true,true,true,25),
('crd','Transmision','Cardanes y crucetas (engrase)',20000,12,'both','alta',true,true,true,26),
-- FRENOS
('brk','Frenos','Pastillas de freno delanteras',25000,30,'both','alta',false,true,true,30),
('brkr','Frenos','Pastillas de freno traseras',30000,36,'both','alta',false,true,true,31),
('dsc','Frenos','Discos de freno delanteros',50000,60,'both','alta',false,true,true,32),
('dscr','Frenos','Discos de freno traseros',60000,72,'both','alta',false,true,true,33),
('bfl','Frenos','Líquido de frenos',null,24,'time','alta',true,true,true,34),
('pbk','Frenos','Revisión freno de estacionamiento',20000,24,'both','media',true,true,true,35),
-- REFRIGERACION
('clt','Refrigeracion','Refrigerante / anticongelante',null,36,'time','alta',true,true,true,40),
('thr','Refrigeracion','Termostato',80000,72,'both','media',false,true,true,41),
('mrf','Refrigeracion','Mangueras de refrigeración',60000,60,'both','media',false,true,true,42),
-- TREN DELANTERO
('rot','TrenDelantero','Rótulas y terminales',20000,12,'both','alta',false,true,true,50),
('buj','TrenDelantero','Bujes y silent blocks',40000,36,'both','media',false,true,true,51),
('bar','TrenDelantero','Bujes barra estabilizadora',40000,36,'both','media',false,true,true,52),
('amr','TrenDelantero','Amortiguadores',60000,60,'both','media',false,true,true,53),
('lft','TrenDelantero','Revisión kit de levante',10000,6,'both','alta',false,true,true,54),
('ang','TrenDelantero','Convergencia y camber',15000,12,'both','alta',false,true,true,55),
('rod','TrenDelantero','Rodamientos de rueda',40000,36,'both','alta',false,true,true,56),
-- DIRECCION
('ali','Direccion','Alineación y balanceo',10000,12,'both','media',true,true,true,60),
('psf','Direccion','Líquido dirección hidráulica',40000,36,'both','media',true,true,true,61),
-- NEUMATICOS
('rt2','Neumaticos','Rotación de neumáticos',10000,12,'both','media',true,true,true,70),
('pre','Neumaticos','Chequeo de presión',5000,3,'both','media',true,true,true,71),
('bnd','Neumaticos','Revisión banda de rodamiento',10000,12,'both','alta',true,true,true,72),
('rep','Neumaticos','Revisión neumático de repuesto',10000,12,'both','media',true,true,true,73),
-- ELECTRICO
('bat','Electrico','Batería (bornes y nivel)',null,12,'time','media',false,true,true,80),
('alt','Electrico','Alternador (inspección)',80000,60,'both','media',false,true,true,81),
('bob','Electrico','Bobinas de encendido',50000,60,'both','media',false,true,true,82),
('luz','Electrico','Revisión luces y señalización',10000,12,'both','media',true,true,true,83),
-- CLIMATIZACION
('acf','Climatizacion','Filtro A/C + carga de refrigerante',null,24,'time','baja',false,true,true,90),
('mol','Climatizacion','Esterilización moho en A/C',null,12,'time','media',false,true,true,91),
('eva','Climatizacion','Descontaminación evaporador A/C',null,48,'time','media',false,true,true,92),
-- GENERAL
('mng','General','Revisión mangueras y correas',10000,12,'both','media',false,true,true,100),
('esc','General','Revisión sistema de escape',20000,24,'both','media',false,true,true,101),
('lub','General','Lubricación de puntos y bisagras',10000,12,'both','baja',false,true,true,102),
('lmp','General','Revisión limpiaparabrisas',null,12,'time','baja',false,true,true,103);

-- ── FUNCTION: auto-update workshop level ──────────────────────
create or replace function public.update_workshop_level()
returns trigger language plpgsql as $$
begin
  new.level := case
    when new.points >= 2500 then 'master'
    when new.points >= 1500 then 'experto'
    when new.points >= 700  then 'especialista'
    when new.points >= 300  then 'tecnico'
    else 'basico'
  end;
  return new;
end;
$$;

create trigger workshop_level_trigger
  before update of points on public.workshops
  for each row execute function public.update_workshop_level();

-- ── FUNCTION: create profile on signup ───────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── INDEXES ──────────────────────────────────────────────────
create index idx_vehicles_owner on public.vehicles(current_owner);
create index idx_vehicles_plate on public.vehicles(plate);
create index idx_service_history_vin on public.service_history(vin);
create index idx_service_history_status on public.service_history(status);
create index idx_vehicle_maint_vin on public.vehicle_maint(vin);
create index idx_custom_maint_vin on public.custom_maint(vin);
create index idx_vehicle_docs_vin on public.vehicle_documents(vin);
