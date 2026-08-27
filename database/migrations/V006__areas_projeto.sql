BEGIN;

CREATE TABLE areas_projeto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(120) NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_areas_projeto_nome UNIQUE (nome),
    CONSTRAINT ck_areas_projeto_nome CHECK (length(btrim(nome)) >= 2)
);

CREATE TRIGGER trg_areas_projeto_atualizado_em
BEFORE UPDATE ON areas_projeto
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
