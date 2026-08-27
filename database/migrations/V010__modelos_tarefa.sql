BEGIN;

CREATE TABLE modelos_tarefa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etapa_id UUID NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT NOT NULL,
    obrigatoria BOOLEAN NOT NULL DEFAULT TRUE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_modelos_tarefa_etapa
        FOREIGN KEY (etapa_id) REFERENCES etapas_jornada(id) ON DELETE RESTRICT,
    CONSTRAINT uq_modelos_tarefa_etapa_titulo UNIQUE (etapa_id, titulo),
    CONSTRAINT ck_modelos_tarefa_titulo CHECK (length(btrim(titulo)) >= 3),
    CONSTRAINT ck_modelos_tarefa_descricao CHECK (length(btrim(descricao)) >= 5)
);

CREATE TRIGGER trg_modelos_tarefa_atualizado_em
BEFORE UPDATE ON modelos_tarefa
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
