-- ============================================
-- BARBER SHOP APP - SETUP SUPABASE COMPLETO
-- Incolla questo intero file in Supabase Dashboard
-- -> SQL Editor -> New Query -> Run
-- ============================================

-- 1. ESTENSIONI NECESSARIE
create extension if not exists "uuid-ossp";

-- 2. TABELLA: admins
create table admins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  created_at timestamptz default now()
);

-- 3. TABELLA: settings
create table settings (
  id int primary key default 1,
  access_code text not null default 'BARBER2026',
  shop_name text default 'Barber Shop',
  updated_at timestamptz default now(),
  constraint singleton check (id = 1)
);

insert into settings (id, access_code, shop_name) values (1, 'BARBER2026', 'Barber Shop');

-- 4. TABELLA: slots
create table slots (
  id uuid primary key default uuid_generate_v4(),
  slot_date date not null,
  slot_time time not null,
  is_booked boolean default false,
  created_at timestamptz default now(),
  unique(slot_date, slot_time)
);

create index idx_slots_date on slots(slot_date);

-- 5. TABELLA: appointments
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  slot_id uuid references slots(id) on delete cascade not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

create index idx_appointments_slot on appointments(slot_id);

-- 6. ABILITA ROW LEVEL SECURITY
alter table settings enable row level security;
alter table slots enable row level security;
alter table appointments enable row level security;
alter table admins enable row level security;

-- 7. FUNZIONE HELPER: verifica se l'utente loggato è admin
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from admins where user_id = auth.uid()
  );
$$;

-- 8. POLICY: settings
create policy "settings_public_read"
on settings for select
to anon, authenticated
using (true);

create policy "settings_admin_update"
on settings for update
to authenticated
using (is_admin());

-- 9. POLICY: slots
create policy "slots_public_read"
on slots for select
to anon, authenticated
using (true);

create policy "slots_admin_insert"
on slots for insert
to authenticated
with check (is_admin());

create policy "slots_admin_update"
on slots for update
to authenticated
using (is_admin());

create policy "slots_admin_delete"
on slots for delete
to authenticated
using (is_admin());

-- 10. POLICY: appointments
create policy "appointments_public_insert"
on appointments for insert
to anon, authenticated
with check (true);

create policy "appointments_admin_read"
on appointments for select
to authenticated
using (is_admin());

create policy "appointments_admin_delete"
on appointments for delete
to authenticated
using (is_admin());

-- 11. POLICY: admins
create policy "admins_self_read"
on admins for select
to authenticated
using (is_admin());

-- 12. TRIGGER: marca slot come prenotato dopo un insert su appointments
create or replace function mark_slot_booked()
returns trigger
language plpgsql
security definer
as $$
begin
  update slots set is_booked = true where id = new.slot_id;
  return new;
end;
$$;

create trigger trg_mark_slot_booked
after insert on appointments
for each row execute function mark_slot_booked();

-- ============================================
-- DOPO AVER ESEGUITO QUESTO SCRIPT:
-- 1. Vai su Authentication -> Users -> Add User
--    e crea il tuo utente admin (email + password)
-- 2. Copia il suo UUID
-- 3. Esegui questa query (sostituendo l'UUID):
--
-- insert into admins (user_id) values ('INCOLLA-QUI-UUID-UTENTE');
-- ============================================
