-- =====================================================================
-- Desincha Mãe — Seed (modelo híbrido / sequência de dias)
-- Rode DEPOIS das migrations 0001 e 0002.
-- Os 21 exercícios = os 21 vídeos (Dia 01..21). video_url é preenchido
-- após o upload ao Storage (ou editado no /admin).
-- =====================================================================

-- Limpa o conteúdo (seguro em banco novo; em produção com dados, cuidado).
delete from user_plan_items;
delete from activities;
delete from challenges;

-- 21 exercícios, um por dia, em ordem. tipo/duração ficam nulos por ora.
insert into activities (titulo, nivel, ativo, ordem)
select 'Dia ' || lpad(g::text, 2, '0'), 1, true, g
from generate_series(1, 21) g;

-- Desafios (um por semana do ciclo). semana_do_ciclo é derivada do progresso.
insert into challenges (titulo, descricao, semana_do_ciclo, nivel) values
('Primeiros passos', 'Complete 5 atividades nesta primeira semana. Você consegue!', 1, 1),
('Pegando o ritmo', 'Faça atividades em 3 dias seguidos nesta semana.', 2, 1),
('Mais firme', 'Complete todos os dias desta semana.', 3, 1),
('Fechou o ciclo!', 'Complete a semana inteira e feche seu ciclo. 🎉', 4, 1);
