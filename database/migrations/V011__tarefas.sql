BEGIN;

CREATE TABLE tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipe_id UUID NOT NULL,
    etapa_id UUID NOT NULL,
    modelo_tarefa_id UUID,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT NOT NULL,
    data_entrega TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    obrigatoria BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por UUID,
    concluida_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tarefas_equipe
        FOREIGN KEY (equipe_id) REFERENCES equipes(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tarefas_etapa
        FOREIGN KEY (etapa_id) REFERENCES etapas_jornada(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tarefas_modelo
        FOREIGN KEY (modelo_tarefa_id) REFERENCES modelos_tarefa(id) ON DELETE SET NULL,
    CONSTRAINT fk_tarefas_criador
        FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT ck_tarefas_titulo CHECK (length(btrim(titulo)) >= 3),
    CONSTRAINT ck_tarefas_descricao CHECK (length(btrim(descricao)) >= 5),
    CONSTRAINT ck_tarefas_status CHECK (status IN (
        'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'OVERDUE', 'APPROVED', 'CHANGES_REQUESTED'
    )),
    CONSTRAINT ck_tarefas_concluida CHECK (
        (status = 'APPROVED' AND concluida_em IS NOT NULL)
        OR (status <> 'APPROVED' AND concluida_em IS NULL)
    )
);

CREATE TRIGGER trg_tarefas_atualizado_em
BEFORE UPDATE ON tarefas
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

COMMIT;
