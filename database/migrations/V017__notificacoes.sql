BEGIN;

CREATE TABLE log_notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_destinatario_id UUID NOT NULL,
    equipe_id UUID,
    tarefa_id UUID,
    tipo_notificacao VARCHAR(80) NOT NULL,
    canal VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    assunto VARCHAR(300) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    id_mensagem_provedor VARCHAR(255),
    tentativas SMALLINT NOT NULL DEFAULT 0,
    mensagem_erro TEXT,
    agendada_para TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enviada_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_notificacoes_usuario
        FOREIGN KEY (usuario_destinatario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_log_notificacoes_equipe
        FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_log_notificacoes_tarefa
        FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE RESTRICT,
    CONSTRAINT ck_log_notificacoes_tipo CHECK (length(btrim(tipo_notificacao)) >= 3),
    CONSTRAINT ck_log_notificacoes_canal CHECK (canal IN ('EMAIL', 'WHATSAPP')),
    CONSTRAINT ck_log_notificacoes_status CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')),
    CONSTRAINT ck_log_notificacoes_tentativas CHECK (tentativas >= 0),
    CONSTRAINT ck_log_notificacoes_enviada CHECK (
        (status = 'SENT' AND enviada_em IS NOT NULL) OR status <> 'SENT'
    )
);

CREATE TRIGGER trg_log_notificacoes_atualizado_em
BEFORE UPDATE ON log_notificacoes
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

CREATE TABLE preferencias_notificacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    tipo_notificacao VARCHAR(80) NOT NULL,
    canal VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    habilitada BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_preferencias_notificacao_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT uq_preferencias_notificacao UNIQUE (usuario_id, tipo_notificacao, canal),
    CONSTRAINT ck_preferencias_notificacao_tipo CHECK (length(btrim(tipo_notificacao)) >= 3),
    CONSTRAINT ck_preferencias_notificacao_canal CHECK (canal IN ('EMAIL', 'WHATSAPP'))
);

CREATE TRIGGER trg_preferencias_notificacao_atualizado_em
BEFORE UPDATE ON preferencias_notificacao
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
