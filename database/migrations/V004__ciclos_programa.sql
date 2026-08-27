BEGIN;

CREATE TABLE ciclos_programa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(120) NOT NULL,
    ano SMALLINT NOT NULL,
    semestre SMALLINT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ciclos_programa_ano_semestre UNIQUE (ano, semestre),
    CONSTRAINT uq_ciclos_programa_nome UNIQUE (nome),
    CONSTRAINT ck_ciclos_programa_ano CHECK (ano BETWEEN 2000 AND 2200),
    CONSTRAINT ck_ciclos_programa_semestre CHECK (semestre IN (1, 2)),
    CONSTRAINT ck_ciclos_programa_datas CHECK (data_fim >= data_inicio),
    CONSTRAINT ck_ciclos_programa_nome CHECK (length(btrim(nome)) >= 2)
);

CREATE TRIGGER trg_ciclos_programa_atualizado_em
BEFORE UPDATE ON ciclos_programa
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
