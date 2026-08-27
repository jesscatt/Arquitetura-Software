BEGIN;

CREATE TABLE equipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    etapa_atual_id UUID NOT NULL,
    mentor_id UUID,
    ciclo_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    concluida_em TIMESTAMPTZ,
    encerrada_em TIMESTAMPTZ,
    excluida_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_equipes_etapa_atual
        FOREIGN KEY (etapa_atual_id) REFERENCES etapas_jornada(id) ON DELETE RESTRICT,
    CONSTRAINT fk_equipes_mentor
        FOREIGN KEY (mentor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT fk_equipes_ciclo
        FOREIGN KEY (ciclo_id) REFERENCES ciclos_programa(id) ON DELETE SET NULL,
    CONSTRAINT ck_equipes_nome CHECK (length(btrim(nome)) >= 2),
    CONSTRAINT ck_equipes_status CHECK (status IN (
        'ACTIVE', 'PAUSED', 'DROPPED_OUT', 'READY_FOR_INOVAMF',
        'REFERRED_TO_INOVAMF', 'COMPLETED'
    )),
    CONSTRAINT ck_equipes_conclusao CHECK (
        concluida_em IS NULL OR status IN ('READY_FOR_INOVAMF', 'REFERRED_TO_INOVAMF', 'COMPLETED')
    ),
    CONSTRAINT ck_equipes_encerramento CHECK (
        encerrada_em IS NULL OR status IN ('DROPPED_OUT', 'REFERRED_TO_INOVAMF', 'COMPLETED')
    )
);

CREATE TRIGGER trg_equipes_atualizado_em
BEFORE UPDATE ON equipes
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
