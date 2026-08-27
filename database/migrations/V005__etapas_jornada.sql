BEGIN;

CREATE TABLE etapas_jornada (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_etapa SMALLINT NOT NULL,
    nome VARCHAR(160) NOT NULL,
    descricao TEXT,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_etapas_jornada_numero UNIQUE (numero_etapa),
    CONSTRAINT uq_etapas_jornada_nome UNIQUE (nome),
    CONSTRAINT ck_etapas_jornada_numero CHECK (numero_etapa > 0),
    CONSTRAINT ck_etapas_jornada_nome CHECK (length(btrim(nome)) >= 2)
);

COMMENT ON TABLE etapas_jornada IS 'Catálogo configurável; novas etapas não exigem alteração estrutural.';

CREATE TRIGGER trg_etapas_jornada_atualizado_em
BEFORE UPDATE ON etapas_jornada
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
