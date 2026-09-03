-- InfoHub — banco inicial com RBAC, jornada e dados de demonstração

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
  curso VARCHAR(100) NOT NULL,
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
 ('Jessika Rodrigues','jessika@infohub.com','scrypt$d45e449d88de292ea695183cbdc03846$65711baa32e13e1962eafd7e91383bc530e3a0305990d2f7371d75fbd414f2f0210afdd41de7c3e01897aa0a6c93f6dd45af1a0923b4811f793d26c1dac247ae','aluno',(SELECT id FROM perfis WHERE nome='Aluno líder'));

INSERT INTO etapas_jornada (numero,nome,descricao,entregavel) VALUES
 (1,'Envio da ideia','Aluno preenche o formulário inicial contando a ideia.','Cadastro da ideia'),
 (2,'Contato com a equipe','Equipe InfoHub analisa a proposta e agenda o primeiro encontro.','Agendamento confirmado'),
 (3,'Encontro 1 – Entendendo a ideia','Mentor e aluno definem problema, público-alvo e solução inicial.','Problema, público-alvo e solução definidos'),
 (4,'Encontro 2 – Proposta de valor','Construção do Value Proposition Design.','Value Proposition Design'),
 (5,'Encontro 3 – Modelo de negócio','Construção do Business Model Canvas.','Business Model Canvas'),
 (6,'Encontro 4 – Pitch e inscrição','Revisão geral, gravação do Pitch e conferência de documentos.','Pitch, Canvas final, VPD final e dados dos integrantes');

INSERT INTO equipes (lider_id,nome_projeto,descricao_inicial,area_setor,estagio_atual,mentor_id) VALUES
 (3,'InfoHub','Sistema de acompanhamento da jornada empreendedora.','EdTech','prototipo',2);

INSERT INTO integrantes_equipe (equipe_id,usuario_id,nome,curso,semestre,tipo) VALUES
 (1,3,'Jessika Rodrigues','Administração','6º','lider');

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
