-- =====================================================================
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
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entregas_tipo_check') THEN
    ALTER TABLE entregas ADD CONSTRAINT entregas_tipo_check CHECK (tipo IN ('arquivo','link'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entregas_status_check') THEN
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
