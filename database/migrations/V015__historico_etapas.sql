BEGIN;

CREATE TABLE historico_etapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL,
    etapa_anterior_id UUID,
    etapa_nova_id UUID NOT NULL,
    alterado_por UUID,
    motivo TEXT,
    alteracao_manual BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historico_etapas_equipe
        FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_historico_etapas_anterior
        FOREIGN KEY (etapa_anterior_id) REFERENCES etapas_jornada(id) ON DELETE RESTRICT,
    CONSTRAINT fk_historico_etapas_nova
        FOREIGN KEY (etapa_nova_id) REFERENCES etapas_jornada(id) ON DELETE RESTRICT,
    CONSTRAINT fk_historico_etapas_usuario
        FOREIGN KEY (alterado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT ck_historico_etapas_mudanca CHECK (
        etapa_anterior_id IS NULL OR etapa_anterior_id <> etapa_nova_id
    ),
    CONSTRAINT ck_historico_etapas_motivo_manual CHECK (
        alteracao_manual = FALSE OR length(btrim(motivo)) >= 3
    )
);

COMMENT ON TABLE historico_etapas IS 'Histórico append-only de entrada, avanço e retrocesso na jornada.';

COMMIT;
