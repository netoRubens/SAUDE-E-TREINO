-- Satori — esquema do backend (Supabase / PostgreSQL). Cole no SQL Editor do projeto e execute uma vez.
-- Segurança: RLS ligado; cada usuário só lê/grava o que é dele; anônimos não têm acesso a nada.

-- 1) Dados do app (perfil, metas, peso, dieta, treinos, água, passos, hábitos...) — um registro por linha.
create table public.records (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  tbl        text        not null check (tbl in ('kv','profileLog','goals','weights','foods','plan','foodlog','workouts','sessions','water','steps','habits','habitlog')),
  uid        text        not null check (char_length(uid) between 1 and 64),
  data       jsonb       not null check (pg_column_size(data) < 200000),
  updated_at timestamptz not null,
  deleted    boolean     not null default false,
  primary key (user_id, tbl, uid)
);
create index records_user_updated on public.records (user_id, updated_at);

-- 2) Atividades de corrida (colunas próprias para consulta e estatística; trajeto privado por padrão).
create table public.activities (
  id              uuid        not null,                 -- gerado no aparelho: evita duplicidade ao sincronizar
  user_id         uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  kind            text        not null default 'corrida' check (kind = 'corrida'),
  state           text        not null default 'completed' check (state = 'completed'),
  started_at      timestamptz not null,
  ended_at        timestamptz not null,
  active_ms       bigint      not null check (active_ms >= 0),
  distance_m      double precision not null check (distance_m >= 0),
  avg_pace_sec_km double precision check (avg_pace_sec_km > 0),
  avg_speed_kmh   double precision check (avg_speed_kmh >= 0),
  start_label     text        check (char_length(start_label) <= 200),
  route           jsonb       not null default '[]' check (jsonb_typeof(route) = 'array' and jsonb_array_length(route) <= 100000),
  device_id       text        check (char_length(device_id) <= 64),
  updated_at      timestamptz not null default now(),
  deleted         boolean     not null default false,
  primary key (user_id, id),
  check (ended_at >= started_at)
);
create index activities_user_started on public.activities (user_id, started_at desc);

-- 3) Conflitos: vence a versão mais recente (updated_at). Atualização mais antiga é ignorada.
create function public.keep_newer() returns trigger language plpgsql as $$
begin
  if new.updated_at < old.updated_at then return null; end if;
  return new;
end $$;
create trigger records_keep_newer    before update on public.records    for each row execute function public.keep_newer();
create trigger activities_keep_newer before update on public.activities for each row execute function public.keep_newer();

-- 4) Segurança por linha
alter table public.records    enable row level security;
alter table public.activities enable row level security;
create policy records_owner    on public.records    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy activities_owner on public.activities for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.records, public.activities from anon;
