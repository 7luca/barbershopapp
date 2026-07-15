-- ============================================
-- MIGRAZIONE V2 — Da eseguire su Supabase SQL Editor
-- (le tabelle esistenti create in precedenza restano intatte)
-- ============================================

-- 1. Nuove colonne su slots: apertura/chiusura manuale per singolo slot
alter table slots add column if not exists is_open boolean not null default true;

-- 2. Nuove colonne su appointments: servizio scelto e note del cliente
alter table appointments add column if not exists service text;
alter table appointments add column if not exists notes text;

-- 3. Tabella business_hours: il "template" settimanale di orari
--    day_of_week: 1=Lunedì ... 6=Sabato (Domenica non è configurabile, sempre chiusa)
create table if not exists business_hours (
  id uuid primary key default uuid_generate_v4(),
  day_of_week smallint not null check (day_of_week between 1 and 6),
  slot_time time not null,
  is_active boolean not null default true,
  unique(day_of_week, slot_time)
);

alter table business_hours enable row level security;
-- Nessuna policy pubblica: solo il backend (service_role key) può leggere/scrivere questa tabella.

-- 4. Seed dei default: Lun-Ven 9-13 / 15-19, Sab 9-13 / 15-17 (slot da 30 minuti)
do $$
declare
  d int;
  t time;
begin
  for d in 1..5 loop
    t := '09:00'; while t < '13:00' loop
      insert into business_hours (day_of_week, slot_time) values (d, t) on conflict do nothing;
      t := t + interval '30 minutes';
    end loop;
    t := '15:00'; while t < '19:00' loop
      insert into business_hours (day_of_week, slot_time) values (d, t) on conflict do nothing;
      t := t + interval '30 minutes';
    end loop;
  end loop;

  t := '09:00'; while t < '13:00' loop
    insert into business_hours (day_of_week, slot_time) values (6, t) on conflict do nothing;
    t := t + interval '30 minutes';
  end loop;
  t := '15:00'; while t < '17:00' loop
    insert into business_hours (day_of_week, slot_time) values (6, t) on conflict do nothing;
    t := t + interval '30 minutes';
  end loop;
end $$;
