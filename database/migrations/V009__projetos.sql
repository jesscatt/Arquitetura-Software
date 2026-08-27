BEGIN;

CREATE TABLE projetos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL,
    nome VARCHAR(200) NOT NULL,
    descricao_inicial TEXT NOT NULL,
    area_id UUID NOT NULL,
    estagio_desenvolvimento VARCHAR(30) NOT NULL,
    origem_divulgacao VARCHAR(200),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_projetos_equipe
        FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_projetos_area
        FOREIGN KEY (area_id) REFERENCES areas_projeto(id) ON DELETE RESTRICT,
    CONSTRAINT uq_projetos_equipe UNIQUE (equipe_id),
    CONSTRAINT ck_projetos_nome CHECK (length(btrim(nome)) >= 2),
    CONSTRAINT ck_projetos_descricao CHECK (length(btrim(descricao_inicial)) >= 10),
    CONSTRAINT ck_projetos_estagio CHECK (estagio_desenvolvimento IN (
        'IDEA', 'PROTOTYPE', 'MVP_IN_DEVELOPMENT', 'MVP_READY'
    ))
);

CREATE TRIGGER trg_projetos_atualizado_em
BEFORE UPDATE ON projetos
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
