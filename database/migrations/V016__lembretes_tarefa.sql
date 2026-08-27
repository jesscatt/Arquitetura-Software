BEGIN;

CREATE TABLE lembretes_tarefa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarefa_id UUID NOT NULL,
    tipo_lembrete VARCHAR(20) NOT NULL,
    agendado_para TIMESTAMPTZ NOT NULL,
    enviado_em TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    tentativas SMALLINT NOT NULL DEFAULT 0,
    ultimo_erro TEXT,
    criado_por UUID,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lembretes_tarefa_tarefa
        FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE RESTRICT,
    CONSTRAINT fk_lembretes_tarefa_criador
        FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT ck_lembretes_tarefa_tipo CHECK (tipo_lembrete IN ('AUTOMATIC', 'MANUAL')),
    CONSTRAINT ck_lembretes_tarefa_status CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')),
    CONSTRAINT ck_lembretes_tarefa_tentativas CHECK (tentativas >= 0),
    CONSTRAINT ck_lembretes_tarefa_enviado CHECK (
        (status = 'SENT' AND enviado_em IS NOT NULL) OR status <> 'SENT'
    )
);

CREATE TRIGGER trg_lembretes_tarefa_atualizado_em
BEFORE UPDATE ON lembretes_tarefa
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
