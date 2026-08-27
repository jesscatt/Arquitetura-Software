BEGIN;

CREATE TABLE entregas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tarefa_id UUID NOT NULL,
    enviado_por UUID NOT NULL,
    numero_versao INTEGER NOT NULL,
    comentario_aluno TEXT,
    status_revisao VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    comentario_revisor TEXT,
    revisado_por UUID,
    enviado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revisado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_entregas_tarefa
        FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE RESTRICT,
    CONSTRAINT fk_entregas_autor
        FOREIGN KEY (enviado_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_entregas_revisor
        FOREIGN KEY (revisado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT uq_entregas_tarefa_versao UNIQUE (tarefa_id, numero_versao),
    CONSTRAINT ck_entregas_versao CHECK (numero_versao > 0),
    CONSTRAINT ck_entregas_status CHECK (status_revisao IN ('PENDING', 'APPROVED', 'CHANGES_REQUESTED')),
    CONSTRAINT ck_entregas_revisao CHECK (
        (status_revisao = 'PENDING' AND revisado_em IS NULL AND revisado_por IS NULL)
        OR (status_revisao <> 'PENDING' AND revisado_em IS NOT NULL)
    ),
    CONSTRAINT ck_entregas_comentario_ajustes CHECK (
        status_revisao <> 'CHANGES_REQUESTED' OR length(btrim(comentario_revisor)) >= 3
    ),
    CONSTRAINT ck_entregas_data_revisao CHECK (revisado_em IS NULL OR revisado_em >= enviado_em)
);

COMMENT ON TABLE entregas IS 'Histórico append-only: cada reenvio cria um novo número de versão.';

COMMIT;
