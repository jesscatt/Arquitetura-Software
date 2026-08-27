BEGIN;

CREATE TABLE anotacoes_mentor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL,
    etapa_id UUID,
    autor_id UUID NOT NULL,
    conteudo TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_anotacoes_mentor_equipe
        FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_anotacoes_mentor_etapa
        FOREIGN KEY (etapa_id) REFERENCES etapas_jornada(id) ON DELETE RESTRICT,
    CONSTRAINT fk_anotacoes_mentor_autor
        FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT ck_anotacoes_mentor_conteudo CHECK (length(btrim(conteudo)) >= 3)
);

COMMENT ON TABLE anotacoes_mentor IS 'Conteúdo interno que a futura API não deve expor aos alunos.';

CREATE TRIGGER trg_anotacoes_mentor_atualizado_em
BEFORE UPDATE ON anotacoes_mentor
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
