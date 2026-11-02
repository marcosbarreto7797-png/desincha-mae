-- =====================================================================
-- Desincha Mãe — Migration 0002 (modelo de conteúdo híbrido / sequência)
-- Aditiva e não destrutiva. Rode DEPOIS da 0001.
-- =====================================================================

-- Os 21 vídeos entram como atividades identificadas por `ordem` (1..21).
alter table activities add column if not exists ordem int;
create unique index if not exists activities_ordem_unica
  on activities (ordem) where ordem is not null;

-- No modelo sequencial, tipo/duração não são obrigatórios (os vídeos são "o dia").
alter table activities alter column tipo drop not null;
alter table activities alter column duracao_min drop not null;

-- Cada semana da usuária guarda em que dia GLOBAL da sequência ela começa.
alter table user_weeks add column if not exists dia_inicial int;
