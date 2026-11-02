-- =====================================================================
-- Desincha Mãe — Migration inicial (Fase 1)
-- Schema + RLS + trigger de perfil + helpers de admin
-- =====================================================================

-- ------------------------- ENUMS -------------------------
create type assinatura_status as enum ('ativo', 'inativo');
create type user_role as enum ('user', 'admin');
create type atividade_tipo as enum
  ('respiracao', 'mobilidade', 'fortalecimento', 'caminhada', 'autocuidado');
create type cycle_status as enum ('ativo', 'concluido');

-- ------------------------- PROFILES -------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text unique not null,
  data_inicio date default current_date,
  fase_pos_parto text,                       -- faixa: ex '0-6sem','6-12sem','3-6m','6m+'
  tempo_disponivel int check (tempo_disponivel in (5, 10, 15)),
  nivel int not null default 1 check (nivel between 1 and 3),
  horario_lembrete time,
  lembrete_ativo boolean not null default true,
  status_assinatura assinatura_status not null default 'inativo',
  liberacao_medica_confirmada boolean not null default false,
  onboarding_completo boolean not null default false,
  role user_role not null default 'user',
  push_subscription jsonb,                   -- Web Push subscription
  created_at timestamptz not null default now()
);

-- ------------------------- BIBLIOTECA -------------------------
create table activities (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  tipo atividade_tipo not null,
  duracao_min int not null,
  nivel int not null check (nivel between 1 and 3),
  video_url text,
  instrucoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table plan_templates (
  id uuid primary key default gen_random_uuid(),
  semana_do_ciclo int not null check (semana_do_ciclo between 1 and 4),
  nivel int not null check (nivel between 1 and 3),
  qtd_atividades int not null,
  distribuicao jsonb not null,               -- {"respiracao":2,"mobilidade":3,...}
  unique (semana_do_ciclo, nivel)
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  semana_do_ciclo int not null check (semana_do_ciclo between 1 and 4),
  nivel int not null check (nivel between 1 and 3),
  ativo boolean not null default true
);

-- ------------------------- PROGRESSO DA USUÁRIA -------------------------
create table cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  numero int not null,
  data_inicio date not null,
  status cycle_status not null default 'ativo',
  unique (user_id, numero)
);

create table user_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  cycle_id uuid not null references cycles(id) on delete cascade,
  semana_do_ciclo int not null check (semana_do_ciclo between 1 and 4),
  data_inicio date not null,
  adesao_pct int,                            -- preenchido no fechamento
  motivo_ajuste text,                        -- frase mostrada à usuária
  created_at timestamptz not null default now()
);

create table user_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_week_id uuid not null references user_weeks(id) on delete cascade,
  activity_id uuid not null references activities(id),
  data_prevista date not null,
  concluido_em timestamptz                    -- null = não feito
);

create table user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  challenge_id uuid not null references challenges(id),
  concluido_em timestamptz,
  unique (user_id, challenge_id)
);

-- ------------------------- WEBHOOK -------------------------
create table webhook_logs (
  id uuid primary key default gen_random_uuid(),
  origem text not null default 'kiwify',
  event_id text,                             -- id do evento → idempotência
  payload_bruto jsonb not null,
  processado boolean not null default false,
  erro text,
  created_at timestamptz not null default now()
);
create unique index webhook_logs_evento_unico
  on webhook_logs (origem, event_id) where event_id is not null;

-- ------------------------- ÍNDICES -------------------------
create index idx_plan_items_week on user_plan_items (user_week_id);
create index idx_weeks_user_cycle on user_weeks (user_id, cycle_id);
create index idx_cycles_user_status on cycles (user_id, status);
create index idx_activities_tipo_nivel on activities (tipo, nivel) where ativo;

-- =====================================================================
-- HELPERS
-- =====================================================================

-- is_admin(): security definer evita recursão de RLS ao ler profiles
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Cria o perfil automaticamente quando um usuário de auth é criado.
-- Em produção o webhook Kiwify cria o auth.user e depois faz UPDATE do status.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- RLS
-- =====================================================================
alter table profiles        enable row level security;
alter table activities      enable row level security;
alter table plan_templates  enable row level security;
alter table challenges      enable row level security;
alter table cycles          enable row level security;
alter table user_weeks      enable row level security;
alter table user_plan_items enable row level security;
alter table user_challenges enable row level security;
alter table webhook_logs    enable row level security;

-- ---- PROFILES: usuária só o próprio; admin lê todos ----
create policy own_profile on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy admin_read_profiles on profiles
  for select using (is_admin());

-- ---- DADOS DA USUÁRIA ----
create policy own_cycles on cycles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy own_weeks on user_weeks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy own_items on user_plan_items
  for all using (
    exists (select 1 from user_weeks w
            where w.id = user_week_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from user_weeks w
            where w.id = user_week_id and w.user_id = auth.uid())
  );

create policy own_challenges on user_challenges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- BIBLIOTECA: todos leem; só admin escreve ----
create policy read_activities on activities for select using (true);
create policy admin_write_activities on activities
  for all using (is_admin()) with check (is_admin());

create policy read_templates on plan_templates for select using (true);
create policy admin_write_templates on plan_templates
  for all using (is_admin()) with check (is_admin());

create policy read_challenges on challenges for select using (true);
create policy admin_write_challenges on challenges
  for all using (is_admin()) with check (is_admin());

-- ---- WEBHOOK_LOGS: nenhuma policy → só service_role (bypassa RLS) ----
