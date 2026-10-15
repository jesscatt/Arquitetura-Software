-- =====================================================================
-- InfoHub - G1 / seed de demonstração
-- Cenário exigido pelo slide "Arquitetura de Sistemas - Problemas do
-- Monolito + G1". Idempotente: pode ser executado novamente.
--
-- Garante:
--   * 1 administrador;
--   * 4 mentores;
--   * 3 equipes com pelo menos 3 integrantes e 1 líder;
--   * um mentor atendendo 2 equipes e outro atendendo a terceira;
--   * 2 equipes na Etapa 2 após a aprovação da Etapa 1;
--   * 1 equipe com tarefa de prazo atrasado.
-- =====================================================================

-- A senha de demonstração das contas criadas é: demo1234.
-- O hash abaixo é o mesmo usado pelo schema inicial.
DO $$
DECLARE
  senha_demo TEXT := 'scrypt$d45e449d88de292ea695183cbdc03846$65711baa32e13e1962eafd7e91383bc530e3a0305990d2f7371d75fbd414f2f0210afdd41de7c3e01897aa0a6c93f6dd45af1a0923b4811f793d26c1dac247ae';
BEGIN
  -- 1) Mentores.
  INSERT INTO usuarios (nome,email,senha_hash,tipo,perfil_id)
  VALUES
    ('Augusto Gehrke','augusto@infohub.com',senha_demo,'mentor',(SELECT id FROM perfis WHERE nome='Mentor')),
    ('Marina Costa','marina@infohub.com',senha_demo,'mentor',(SELECT id FROM perfis WHERE nome='Mentor')),
    ('Rafael Mendes','rafael@infohub.com',senha_demo,'mentor',(SELECT id FROM perfis WHERE nome='Mentor')),
    ('Camila Souza','camila@infohub.com',senha_demo,'mentor',(SELECT id FROM perfis WHERE nome='Mentor'))
  ON CONFLICT (email) DO UPDATE
    SET tipo=EXCLUDED.tipo, perfil_id=EXCLUDED.perfil_id;

  -- 2) Líderes.
  INSERT INTO usuarios (nome,email,senha_hash,tipo,perfil_id)
  VALUES
    ('Ana Lima','ana.lima@infohub.com',senha_demo,'aluno',(SELECT id FROM perfis WHERE nome='Aluno líder')),
    ('Bruno Alves','bruno.alves@infohub.com',senha_demo,'aluno',(SELECT id FROM perfis WHERE nome='Aluno líder')),
    ('Carla Mendes','carla.mendes@infohub.com',senha_demo,'aluno',(SELECT id FROM perfis WHERE nome='Aluno líder'))
  ON CONFLICT (email) DO UPDATE
    SET tipo=EXCLUDED.tipo, perfil_id=EXCLUDED.perfil_id;

  -- 3) Integrantes adicionais.
  INSERT INTO usuarios (nome,email,senha_hash,tipo,perfil_id)
  VALUES
    ('Diego Silva','diego.silva@infohub.com',senha_demo,'integrante',(SELECT id FROM perfis WHERE nome='Integrante')),
    ('Elisa Souza','elisa.souza@infohub.com',senha_demo,'integrante',(SELECT id FROM perfis WHERE nome='Integrante')),
    ('Felipe Rocha','felipe.rocha@infohub.com',senha_demo,'integrante',(SELECT id FROM perfis WHERE nome='Integrante')),
    ('Gabriela Oliveira','gabriela.oliveira@infohub.com',senha_demo,'integrante',(SELECT id FROM perfis WHERE nome='Integrante')),
    ('Henrique Santos','henrique.santos@infohub.com',senha_demo,'integrante',(SELECT id FROM perfis WHERE nome='Integrante')),
    ('Isabela Martins','isabela.martins@infohub.com',senha_demo,'integrante',(SELECT id FROM perfis WHERE nome='Integrante'))
  ON CONFLICT (email) DO UPDATE
    SET tipo=EXCLUDED.tipo, perfil_id=EXCLUDED.perfil_id;
END $$;

-- 4) Três equipes do cenário G1.
INSERT INTO equipes
  (lider_id,nome_projeto,descricao_inicial,area_setor,estagio_atual,
   etapa_atual,status,mentor_id,ciclo)
SELECT
  lider.id,
  v.nome_projeto,
  v.descricao,
  v.area,
  v.estagio,
  v.etapa,
  'ativa',
  mentor.id,
  '2026/2'
FROM (VALUES
  ('ana.lima@infohub.com','Projeto Aurora',
   'Plataforma para organizar projetos acadêmicos e entregas de equipes.',
   'Educacao','prototipo',2,'augusto@infohub.com'),
  ('bruno.alves@infohub.com','Projeto Nexus',
   'Ferramenta de acompanhamento de atividades e comunicação de equipes.',
   'Tecnologia','prototipo',2,'augusto@infohub.com'),
  ('carla.mendes@infohub.com','Projeto Raiz',
   'Solução digital para conectar pequenos produtores a serviços locais.',
   'Agronegocio','mvp_desenvolvimento',3,'marina@infohub.com')
) AS v(email_lider,nome_projeto,descricao,area,estagio,etapa,email_mentor)
JOIN usuarios lider ON lower(lider.email)=lower(v.email_lider)
JOIN usuarios mentor ON lower(mentor.email)=lower(v.email_mentor)
WHERE NOT EXISTS (
  SELECT 1 FROM equipes e WHERE e.nome_projeto=v.nome_projeto
);

-- 5) Garante os 3 integrantes de cada equipe.
INSERT INTO integrantes_equipe
  (equipe_id,usuario_id,nome,email,curso,semestre,tipo)
SELECT e.id,u.id,u.nome,u.email,v.curso,v.semestre,v.tipo
FROM (VALUES
  ('Projeto Aurora','ana.lima@infohub.com','Administração','6º','lider'),
  ('Projeto Aurora','diego.silva@infohub.com','Sistemas de Informação','5º','integrante'),
  ('Projeto Aurora','elisa.souza@infohub.com','Administração','5º','integrante'),
  ('Projeto Nexus','bruno.alves@infohub.com','Sistemas de Informação','6º','lider'),
  ('Projeto Nexus','felipe.rocha@infohub.com','Engenharia','5º','integrante'),
  ('Projeto Nexus','gabriela.oliveira@infohub.com','Administração','6º','integrante'),
  ('Projeto Raiz','carla.mendes@infohub.com','Agronomia','7º','lider'),
  ('Projeto Raiz','henrique.santos@infohub.com','Administração','5º','integrante'),
  ('Projeto Raiz','isabela.martins@infohub.com','Sistemas de Informação','4º','integrante')
) AS v(nome_projeto,email,curso,semestre,tipo)
JOIN equipes e ON e.nome_projeto=v.nome_projeto
JOIN usuarios u ON lower(u.email)=lower(v.email)
WHERE NOT EXISTS (
  SELECT 1 FROM integrantes_equipe ie
  WHERE ie.equipe_id=e.id AND ie.usuario_id=u.id
);

-- 6) Registra a aprovação da Etapa 1 e a entrada na Etapa 2
-- para duas equipes, como solicitado no G1.
INSERT INTO historico_etapas
  (equipe_id,etapa_anterior,etapa_nova,alterado_por,motivo)
SELECT e.id,1,2,admin.id,
       'Seed G1: Etapa 1 aprovada; equipe cursando a Etapa 2.'
FROM equipes e
CROSS JOIN (SELECT id FROM usuarios WHERE email='admin@infohub.com' LIMIT 1) admin
WHERE e.nome_projeto IN ('Projeto Aurora','Projeto Nexus')
  AND NOT EXISTS (
    SELECT 1 FROM historico_etapas h
    WHERE h.equipe_id=e.id AND h.etapa_anterior=1 AND h.etapa_nova=2
  );

-- 7) Tarefas de demonstração, incluindo uma tarefa vencida.
INSERT INTO tarefas
  (equipe_id,titulo,descricao,etapa_relacionada,data_entrega,status,criado_por,obrigatoria)
SELECT e.id,v.titulo,v.descricao,v.etapa,v.data_entrega,v.status,admin.id,v.obrigatoria
FROM (VALUES
  ('Projeto Aurora','Confirmar agendamento do 1o encontro',
   'Tarefa de demonstração da Etapa 2.',2,CURRENT_DATE+5,'pendente',FALSE),
  ('Projeto Nexus','Confirmar agendamento do 1o encontro',
   'Tarefa de demonstração da Etapa 2.',2,CURRENT_DATE+3,'pendente',FALSE),
  ('Projeto Raiz','Enviar definição do problema e público-alvo',
   'Tarefa criada para demonstrar prazo atrasado no G1.',3,CURRENT_DATE-5,'atrasada',TRUE)
) AS v(nome_projeto,titulo,descricao,etapa,data_entrega,status,obrigatoria)
JOIN equipes e ON e.nome_projeto=v.nome_projeto
CROSS JOIN (SELECT id FROM usuarios WHERE email='admin@infohub.com' LIMIT 1) admin
WHERE NOT EXISTS (
  SELECT 1 FROM tarefas t
  WHERE t.equipe_id=e.id AND t.titulo=v.titulo
);

-- 8) Mantém o estado esperado do cenário caso o seed seja reaplicado.
UPDATE equipes SET etapa_atual=2
WHERE nome_projeto IN ('Projeto Aurora','Projeto Nexus');

UPDATE equipes SET etapa_atual=3
WHERE nome_projeto='Projeto Raiz';

UPDATE tarefas
SET status='atrasada', data_entrega=CURRENT_DATE-5
WHERE equipe_id=(SELECT id FROM equipes WHERE nome_projeto='Projeto Raiz')
  AND titulo='Enviar definição do problema e público-alvo';

-- 9) Dados acadêmicos simples para aparecerem na demonstração.
UPDATE usuarios SET curso='Administração',semestre='6º'
WHERE email='ana.lima@infohub.com';
UPDATE usuarios SET curso='Sistemas de Informação',semestre='6º'
WHERE email='bruno.alves@infohub.com';
UPDATE usuarios SET curso='Agronomia',semestre='7º'
WHERE email='carla.mendes@infohub.com';
