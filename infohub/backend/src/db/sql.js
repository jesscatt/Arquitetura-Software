// Gerado a partir de backend/db/*.sql. Se mudar um .sql, atualize aqui também.
// Os SQL ficam dentro de um arquivo .js para a Vercel sempre levá-los junto
// com o servidor (arquivos soltos podem ficar de fora do pacote).

module.exports = {
  // 001_init.sql
  init: String.raw`-- InfoHub — banco inicial com RBAC, jornada e dados de demonstração

CREATE TABLE perfis (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(80) UNIQUE NOT NULL,
  descricao VARCHAR(255),
  sistema BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE permissoes (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(120) UNIQUE NOT NULL,
  modulo VARCHAR(80) NOT NULL,
  acao VARCHAR(80) NOT NULL,
  descricao VARCHAR(255)
);

CREATE TABLE perfil_permissoes (
  perfil_id INTEGER NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  permissao_id INTEGER NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
  PRIMARY KEY (perfil_id, permissao_id)
);

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'aluno' CHECK (tipo IN ('admin','mentor','aluno','integrante')),
  perfil_id INTEGER REFERENCES perfis(id),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  token_reset_senha VARCHAR(255),
  token_reset_expira TIMESTAMP,
  deve_alterar_senha BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_acesso TIMESTAMP,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE equipes (
  id SERIAL PRIMARY KEY,
  lider_id INTEGER NOT NULL REFERENCES usuarios(id),
  nome_projeto VARCHAR(150) NOT NULL,
  descricao_inicial TEXT NOT NULL,
  area_setor VARCHAR(100) NOT NULL,
  estagio_atual VARCHAR(30) NOT NULL CHECK (estagio_atual IN ('ideia','prototipo','mvp_desenvolvimento','mvp_pronto')),
  origem_divulgacao VARCHAR(100),
  etapa_atual SMALLINT NOT NULL DEFAULT 1 CHECK (etapa_atual BETWEEN 1 AND 6),
  status VARCHAR(30) NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','pronta_inovamf','encaminhada_inovamf','inativa')),
  mentor_id INTEGER REFERENCES usuarios(id),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE integrantes_equipe (
  id SERIAL PRIMARY KEY,
  equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(180),
  curso VARCHAR(100),
  semestre VARCHAR(20),
  tipo VARCHAR(20) NOT NULL DEFAULT 'integrante' CHECK (tipo IN ('lider','integrante'))
);

CREATE TABLE etapas_jornada (
  id SERIAL PRIMARY KEY, numero SMALLINT UNIQUE NOT NULL CHECK (numero BETWEEN 1 AND 6), nome VARCHAR(160) NOT NULL, descricao TEXT NOT NULL, entregavel TEXT
);

CREATE TABLE historico_etapas (
  id SERIAL PRIMARY KEY, equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE, etapa_anterior SMALLINT NOT NULL, etapa_nova SMALLINT NOT NULL, alterado_por INTEGER NOT NULL REFERENCES usuarios(id), motivo TEXT, alterado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE anotacoes (
  id SERIAL PRIMARY KEY, equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE, autor_id INTEGER NOT NULL REFERENCES usuarios(id), texto TEXT NOT NULL, criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE modelos_tarefa (
  id SERIAL PRIMARY KEY, titulo VARCHAR(150) NOT NULL, descricao TEXT, etapa_relacionada SMALLINT NOT NULL CHECK (etapa_relacionada BETWEEN 1 AND 6)
);

CREATE TABLE tarefas (
  id SERIAL PRIMARY KEY, equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE, modelo_tarefa_id INTEGER REFERENCES modelos_tarefa(id), titulo VARCHAR(150) NOT NULL, descricao TEXT, etapa_relacionada SMALLINT NOT NULL CHECK (etapa_relacionada BETWEEN 1 AND 6), data_entrega DATE NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','entregue','atrasada','aprovada','reprovada')), criado_por INTEGER NOT NULL REFERENCES usuarios(id), criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE entregas (
  id SERIAL PRIMARY KEY, tarefa_id INTEGER NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE, enviado_por INTEGER NOT NULL REFERENCES usuarios(id), arquivo_url VARCHAR(255) NOT NULL, enviado_em TIMESTAMP NOT NULL DEFAULT NOW(), avaliacao TEXT, nota NUMERIC(5,2), avaliado_por INTEGER REFERENCES usuarios(id)
);

INSERT INTO perfis (nome, descricao, sistema) VALUES
 ('Administrador','Acesso completo ao sistema',TRUE),
 ('Mentor','Acompanha somente as equipes sob sua mentoria',TRUE),
 ('Aluno líder','Gerencia a inscrição e entregas da própria equipe',TRUE),
 ('Integrante','Acesso de leitura/entrega conforme permissões',TRUE);

INSERT INTO permissoes (chave, modulo, acao, descricao) VALUES
 ('usuarios.visualizar','Usuários','Visualizar','Visualizar usuários e perfis'),
 ('usuarios.criar','Usuários','Criar','Criar novos usuários'),
 ('usuarios.editar','Usuários','Editar','Editar usuários'),
 ('usuarios.desativar','Usuários','Desativar','Ativar ou desativar usuários'),
 ('perfis.editar','Perfis','Editar','Alterar permissões dos perfis'),
 ('equipes.visualizar','Equipes','Visualizar','Visualizar equipes permitidas'),
 ('equipes.criar','Equipes','Criar','Criar equipes'),
 ('equipes.editar','Equipes','Editar','Editar equipes e mentor'),
 ('tarefas.visualizar','Tarefas','Visualizar','Visualizar tarefas'),
 ('tarefas.criar','Tarefas','Criar','Criar tarefas'),
 ('tarefas.editar','Tarefas','Editar','Editar tarefas e status'),
 ('entregas.visualizar','Entregas','Visualizar','Visualizar entregas'),
 ('entregas.enviar','Entregas','Enviar','Enviar arquivos de entrega'),
 ('entregas.avaliar','Entregas','Avaliar','Avaliar entregas'),
 ('jornada.visualizar','Jornada','Visualizar','Visualizar etapa atual'),
 ('jornada.avancar','Jornada','Avançar','Avançar ou retroceder etapas'),
 ('relatorios.visualizar','Relatórios','Visualizar','Acessar relatórios'),
 ('auditoria.visualizar','Auditoria','Visualizar','Visualizar registros de auditoria'),
 ('configuracoes.visualizar','Configurações','Visualizar','Acessar configurações'),
 ('configuracoes.editar','Configurações','Editar','Alterar configurações');

-- Administrador recebe tudo; demais perfis recebem o conjunto inicial recomendado.
INSERT INTO perfil_permissoes (perfil_id, permissao_id) SELECT p.id, x.id FROM perfis p CROSS JOIN permissoes x WHERE p.nome='Administrador';
INSERT INTO perfil_permissoes (perfil_id, permissao_id) SELECT p.id, x.id FROM perfis p JOIN permissoes x ON x.chave IN ('equipes.visualizar','tarefas.visualizar','tarefas.criar','tarefas.editar','entregas.visualizar','entregas.avaliar','jornada.visualizar','jornada.avancar','relatorios.visualizar') WHERE p.nome='Mentor';
INSERT INTO perfil_permissoes (perfil_id, permissao_id) SELECT p.id, x.id FROM perfis p JOIN permissoes x ON x.chave IN ('equipes.visualizar','tarefas.visualizar','entregas.visualizar','entregas.enviar','jornada.visualizar') WHERE p.nome='Aluno líder';
INSERT INTO perfil_permissoes (perfil_id, permissao_id) SELECT p.id, x.id FROM perfis p JOIN permissoes x ON x.chave IN ('equipes.visualizar','tarefas.visualizar','entregas.visualizar','entregas.enviar','jornada.visualizar') WHERE p.nome='Integrante';

-- senha de demonstração: demo1234
INSERT INTO usuarios (nome,email,senha_hash,tipo,perfil_id) VALUES
 ('Admin InfoHub','admin@infohub.com','scrypt$d45e449d88de292ea695183cbdc03846$65711baa32e13e1962eafd7e91383bc530e3a0305990d2f7371d75fbd414f2f0210afdd41de7c3e01897aa0a6c93f6dd45af1a0923b4811f793d26c1dac247ae','admin',(SELECT id FROM perfis WHERE nome='Administrador')),
 ('Augusto Gehrke','augusto@infohub.com','scrypt$d45e449d88de292ea695183cbdc03846$65711baa32e13e1962eafd7e91383bc530e3a0305990d2f7371d75fbd414f2f0210afdd41de7c3e01897aa0a6c93f6dd45af1a0923b4811f793d26c1dac247ae','mentor',(SELECT id FROM perfis WHERE nome='Mentor')),
 ('Lucas Ferreira','lucas.ferreira@infohub.com','scrypt$d45e449d88de292ea695183cbdc03846$65711baa32e13e1962eafd7e91383bc530e3a0305990d2f7371d75fbd414f2f0210afdd41de7c3e01897aa0a6c93f6dd45af1a0923b4811f793d26c1dac247ae','aluno',(SELECT id FROM perfis WHERE nome='Aluno líder'));

INSERT INTO etapas_jornada (numero,nome,descricao,entregavel) VALUES
 (1,'Envio da ideia','Aluno preenche o formulário inicial contando a ideia.','Cadastro da ideia'),
 (2,'Contato com a equipe','Equipe InfoHub analisa a proposta e agenda o primeiro encontro.','Agendamento confirmado'),
 (3,'Encontro 1 – Entendendo a ideia','Mentor e aluno definem problema, público-alvo e solução inicial.','Problema, público-alvo e solução definidos'),
 (4,'Encontro 2 – Proposta de valor','Construção do Value Proposition Design.','Value Proposition Design'),
 (5,'Encontro 3 – Modelo de negócio','Construção do Business Model Canvas.','Business Model Canvas'),
 (6,'Encontro 4 – Pitch e inscrição','Revisão geral, gravação do Pitch e conferência de documentos.','Pitch, Canvas final, VPD final e dados dos integrantes');

-- As equipes de demonstração são criadas pelo seed (003_g1_seed.sql).

CREATE INDEX idx_equipes_lider ON equipes(lider_id); CREATE INDEX idx_equipes_mentor ON equipes(mentor_id); CREATE INDEX idx_integrantes_equipe ON integrantes_equipe(equipe_id); CREATE INDEX idx_integrantes_usuario ON integrantes_equipe(usuario_id); CREATE INDEX idx_tarefas_equipe ON tarefas(equipe_id); CREATE INDEX idx_entregas_tarefa ON entregas(tarefa_id);

-- Garantias adicionais de integridade para contas e equipes.
CREATE UNIQUE INDEX uq_integrante_usuario_por_equipe ON integrantes_equipe(equipe_id, usuario_id) WHERE usuario_id IS NOT NULL;
CREATE INDEX idx_historico_equipe_data ON historico_etapas(equipe_id, alterado_em DESC);

-- Auditoria de ações dos usuários.
CREATE TABLE IF NOT EXISTS auditoria_logs (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  acao VARCHAR(30) NOT NULL,
  modulo VARCHAR(60) NOT NULL,
  rota VARCHAR(180) NOT NULL,
  metodo VARCHAR(10) NOT NULL,
  detalhes TEXT,
  ip VARCHAR(80),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auditoria_criado_em ON auditoria_logs(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_logs(usuario_id);
`,

  // 002_v2.sql
  v2: String.raw`-- =====================================================================
-- InfoHub - migracao v2
-- Complementa o schema inicial (db/init.sql) com os itens exigidos pelo
-- Documento de Requisitos v1.0 que ainda nao existiam no banco.
-- Este arquivo e IDEMPOTENTE: pode ser executado quantas vezes for
-- necessario. O backend o aplica automaticamente ao iniciar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Usuarios: dados academicos, contato e LGPD (RF-02 / RNF-02 / RF-21)
-- ---------------------------------------------------------------------
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(30),
  ADD COLUMN IF NOT EXISTS curso VARCHAR(120),
  ADD COLUMN IF NOT EXISTS semestre VARCHAR(20),
  ADD COLUMN IF NOT EXISTS consentimento_lgpd BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consentimento_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS notificacoes_email BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------------------------------------------------------------------
-- 2. Equipes: ciclo/turma para o filtro por periodo (RF-24)
-- ---------------------------------------------------------------------
ALTER TABLE equipes
  ADD COLUMN IF NOT EXISTS ciclo VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_equipes_ciclo ON equipes(ciclo);
CREATE INDEX IF NOT EXISTS idx_equipes_status ON equipes(status);

-- ---------------------------------------------------------------------
-- 3. Areas da ideia configuraveis pelo administrador (RF-02)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS areas_ideia (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO areas_ideia (nome) VALUES
  ('Educacao'), ('Saude'), ('Tecnologia'), ('Sustentabilidade'),
  ('Agronegocio'), ('Servicos'), ('Industria'), ('Financas'), ('Outra')
ON CONFLICT (nome) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Configuracoes do sistema (limites, ciclo atual, lembretes padrao)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracoes (
  chave VARCHAR(80) PRIMARY KEY,
  valor TEXT NOT NULL,
  descricao VARCHAR(255),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('ciclo.atual', '2026/2', 'Ciclo/turma corrente do programa InfoHub'),
  ('upload.tamanho_max_mb', '50', 'Tamanho maximo por arquivo enviado (RNF-04)'),
  ('upload.extensoes', 'pdf,png,jpg,jpeg,webp,mp4,mov,pptx,docx,xlsx,zip', 'Extensoes aceitas nas entregas (RNF-04)'),
  ('equipe.max_integrantes', '6', 'Numero maximo de integrantes por equipe (Q5)'),
  ('equipe.multiplas_por_aluno', 'false', 'Permite que um aluno participe de mais de uma equipe ativa (RN-03 / Q4)'),
  ('lembretes.dias_padrao', '3,1,0', 'Dias de antecedencia usados por padrao nos lembretes (RF-17)'),
  ('jornada.exigir_tarefas_obrigatorias', 'true', 'Bloqueia o avanco de etapa com tarefas obrigatorias nao aprovadas (RN-01)')
ON CONFLICT (chave) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. Modelos de tarefa por etapa (RF-11) e tarefas obrigatorias (RN-01)
-- ---------------------------------------------------------------------
ALTER TABLE modelos_tarefa
  ADD COLUMN IF NOT EXISTS obrigatoria BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prazo_dias INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS obrigatoria BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_data_entrega ON tarefas(data_entrega);

INSERT INTO modelos_tarefa (titulo, descricao, etapa_relacionada, obrigatoria, prazo_dias)
SELECT v.titulo, v.descricao, v.etapa, v.obrigatoria, v.prazo
FROM (VALUES
  ('Confirmar agendamento do 1o encontro', 'Confirme no sistema a data combinada com a equipe InfoHub.', 2::smallint, FALSE, 5),
  ('Descrever problema, publico-alvo e solucao', 'Envie o documento com o problema, o publico-alvo e a solucao inicial definidos no Encontro 1.', 3::smallint, TRUE, 7),
  ('Enviar Value Proposition Design', 'Envie o VPD construido no Encontro 2 (PDF ou imagem).', 4::smallint, TRUE, 7),
  ('Enviar Business Model Canvas', 'Envie o BMC construido no Encontro 3 (PDF ou imagem).', 5::smallint, TRUE, 7),
  ('Enviar Pitch Video', 'Envie o arquivo de video ou o link (YouTube/Drive) do pitch gravado.', 6::smallint, TRUE, 10),
  ('Enviar Canvas e VPD finais revisados', 'Versoes finais dos dois materiais, ja com os ajustes do mentor.', 6::smallint, TRUE, 10),
  ('Confirmar dados de todos os integrantes', 'Revise nome, curso, semestre e e-mail de cada integrante da equipe.', 6::smallint, TRUE, 10)
) AS v(titulo, descricao, etapa, obrigatoria, prazo)
WHERE NOT EXISTS (SELECT 1 FROM modelos_tarefa m WHERE m.titulo = v.titulo);

-- ---------------------------------------------------------------------
-- 6. Entregas: upload real, link externo e versionamento (RF-14/15/16)
-- ---------------------------------------------------------------------
ALTER TABLE entregas
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(10) NOT NULL DEFAULT 'link',
  ADD COLUMN IF NOT EXISTS nome_arquivo VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(150),
  ADD COLUMN IF NOT EXISTS tamanho_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'enviada',
  ADD COLUMN IF NOT EXISTS avaliado_em TIMESTAMP;

ALTER TABLE entregas ALTER COLUMN arquivo_url TYPE VARCHAR(500);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entregas_tipo_check' AND conrelid = 'entregas'::regclass) THEN
    ALTER TABLE entregas ADD CONSTRAINT entregas_tipo_check CHECK (tipo IN ('arquivo','link'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entregas_status_check' AND conrelid = 'entregas'::regclass) THEN
    ALTER TABLE entregas ADD CONSTRAINT entregas_status_check CHECK (status IN ('enviada','aprovada','ajustes'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_entregas_tarefa_versao ON entregas(tarefa_id, versao DESC);

-- ---------------------------------------------------------------------
-- 7. Lembretes automaticos por tarefa (RF-17 / RF-18 / RF-20)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lembretes (
  id SERIAL PRIMARY KEY,
  tarefa_id INTEGER NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'antecedencia',
  dias_antes INTEGER,
  data_envio TIMESTAMP NOT NULL,
  enviado_em TIMESTAMP,
  criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lembretes_pendentes ON lembretes(data_envio) WHERE enviado_em IS NULL;

-- ---------------------------------------------------------------------
-- 8. Log de e-mails enviados (RNF-05 / RNF-06)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emails_log (
  id SERIAL PRIMARY KEY,
  destinatario VARCHAR(180) NOT NULL,
  assunto VARCHAR(255) NOT NULL,
  tipo VARCHAR(60) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'enviado',
  erro TEXT,
  tentativas INTEGER NOT NULL DEFAULT 1,
  equipe_id INTEGER REFERENCES equipes(id) ON DELETE SET NULL,
  tarefa_id INTEGER REFERENCES tarefas(id) ON DELETE SET NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emails_log_criado_em ON emails_log(criado_em DESC);

-- ---------------------------------------------------------------------
-- 9. Ajuste de dados existentes
-- ---------------------------------------------------------------------
UPDATE equipes SET ciclo = (SELECT valor FROM configuracoes WHERE chave = 'ciclo.atual')
WHERE ciclo IS NULL;

UPDATE entregas SET tipo = 'link' WHERE tipo IS NULL;
`,

  // 003_g1_seed.sql
  seed: String.raw`-- =====================================================================
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
`,

};
