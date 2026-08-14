-- RF-01, RF-03: login separado admin/aluno, recuperação de senha, admin cria/edita/desativa contas
CREATE TABLE usuarios (
id SERIAL PRIMARY KEY,
nome VARCHAR(150) NOT NULL,
email VARCHAR(150) UNIQUE NOT NULL,
senha_hash VARCHAR(255) NOT NULL,
tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('admin', 'mentor', 'aluno')),
ativo BOOLEAN NOT NULL DEFAULT TRUE,
token_reset_senha VARCHAR(255),
token_reset_expira TIMESTAMP,
criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- RF-02, RF-05: formulário inicial cria a conta do líder + registra a ideia na Etapa 1
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

-- Formulário inicial: "nome e curso de cada colega de equipe" (campo repetível)
CREATE TABLE integrantes_equipe (
id SERIAL PRIMARY KEY,
equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
nome VARCHAR(150) NOT NULL,
curso VARCHAR(100) NOT NULL,
semestre VARCHAR(20)
);

-- RF-09: histórico de avanço/retrocesso manual de etapa
CREATE TABLE historico_etapas (
id SERIAL PRIMARY KEY,
equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
etapa_anterior SMALLINT NOT NULL,
etapa_nova SMALLINT NOT NULL,
alterado_por INTEGER NOT NULL REFERENCES usuarios(id),
motivo TEXT,
alterado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- RF-10: anotações internas do mentor, não visíveis ao aluno
CREATE TABLE anotacoes (
id SERIAL PRIMARY KEY,
equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
autor_id INTEGER NOT NULL REFERENCES usuarios(id),
texto TEXT NOT NULL,
criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- RF-11: modelos de tarefa pré-configurados por etapa (reutilizáveis entre equipes)
CREATE TABLE modelos_tarefa (
id SERIAL PRIMARY KEY,
titulo VARCHAR(150) NOT NULL,
descricao TEXT,
etapa_relacionada SMALLINT NOT NULL CHECK (etapa_relacionada BETWEEN 1 AND 6)
);

-- RF-11, RF-12: tarefa atribuída a uma equipe, criada livre ou a partir de um modelo
CREATE TABLE tarefas (
id SERIAL PRIMARY KEY,
equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
modelo_tarefa_id INTEGER REFERENCES modelos_tarefa(id),
titulo VARCHAR(150) NOT NULL,
descricao TEXT,
etapa_relacionada SMALLINT NOT NULL CHECK (etapa_relacionada BETWEEN 1 AND 6),
data_entrega DATE NOT NULL,
status VARCHAR(20) NOT NULL DEFAULT 'pendente'
CHECK (status IN ('pendente','em_andamento','entregue','atrasada','aprovada','reprovada')),
criado_por INTEGER NOT NULL REFERENCES usuarios(id),
criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- RF-14: aluno anexa arquivo(s) como entrega de uma tarefa
CREATE TABLE entregas (
id SERIAL PRIMARY KEY,
tarefa_id INTEGER NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
enviado_por INTEGER NOT NULL REFERENCES usuarios(id),
arquivo_url VARCHAR(255) NOT NULL,
enviado_em TIMESTAMP NOT NULL DEFAULT NOW()
);