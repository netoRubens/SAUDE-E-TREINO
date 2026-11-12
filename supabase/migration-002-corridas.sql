-- Satori — migração 002: permite sincronizar corridas (tabela local "activities") e trajetos maiores.
-- Rode UMA vez no SQL Editor do Supabase (só se você já executou o schema.sql antes).
alter table public.records drop constraint if exists records_tbl_check;
alter table public.records add constraint records_tbl_check
  check (tbl in ('kv','profileLog','goals','weights','foods','plan','foodlog','workouts','sessions','water','steps','habits','habitlog','activities'));
alter table public.records drop constraint if exists records_data_check;
alter table public.records add constraint records_data_check check (pg_column_size(data) < 1000000);
