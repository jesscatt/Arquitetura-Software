BEGIN;

CREATE TABLE perfis_aluno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    curso VARCHAR(160) NOT NULL,
    semestre SMALLINT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_perfis_aluno_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT uq_perfis_aluno_usuario UNIQUE (usuario_id),
    CONSTRAINT ck_perfis_aluno_curso CHECK (length(btrim(curso)) >= 2),
    CONSTRAINT ck_perfis_aluno_semestre CHECK (semestre BETWEEN 1 AND 20)
);

CREATE TRIGGER trg_perfis_aluno_atualizado_em
BEFORE UPDATE ON perfis_aluno
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
