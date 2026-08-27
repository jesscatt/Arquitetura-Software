BEGIN;

CREATE TABLE integrantes_equipe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL,
    usuario_id UUID,
    nome VARCHAR(200) NOT NULL,
    curso VARCHAR(160),
    semestre SMALLINT,
    papel_na_equipe VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    entrou_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    saiu_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_integrantes_equipe_equipe
        FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_integrantes_equipe_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT ck_integrantes_equipe_nome CHECK (length(btrim(nome)) >= 2),
    CONSTRAINT ck_integrantes_equipe_curso CHECK (curso IS NULL OR length(btrim(curso)) >= 2),
    CONSTRAINT ck_integrantes_equipe_semestre CHECK (semestre IS NULL OR semestre BETWEEN 1 AND 20),
    CONSTRAINT ck_integrantes_equipe_papel CHECK (papel_na_equipe IN ('LEADER', 'MEMBER')),
    CONSTRAINT ck_integrantes_equipe_datas CHECK (saiu_em IS NULL OR saiu_em >= entrou_em),
    CONSTRAINT ck_integrantes_equipe_ativo CHECK (ativo = FALSE OR saiu_em IS NULL)
);

CREATE UNIQUE INDEX uq_integrantes_equipe_usuario
    ON integrantes_equipe (equipe_id, usuario_id)
    WHERE usuario_id IS NOT NULL;

CREATE UNIQUE INDEX uq_integrantes_equipe_lider_ativo
    ON integrantes_equipe (equipe_id)
    WHERE papel_na_equipe = 'LEADER' AND ativo = TRUE;

COMMENT ON TABLE integrantes_equipe IS 'Aceita integrante com ou sem conta; nome preserva o snapshot histórico.';

CREATE TRIGGER trg_integrantes_equipe_atualizado_em
BEFORE UPDATE ON integrantes_equipe
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
