BEGIN;

CREATE INDEX idx_usuarios_tipo_ativo ON usuarios (tipo, ativo) WHERE excluido_em IS NULL;
CREATE INDEX idx_usuarios_nome_trgm ON usuarios USING GIN (nome gin_trgm_ops);
CREATE INDEX idx_tokens_recuperacao_usuario_expiracao ON tokens_recuperacao_senha (usuario_id, expira_em) WHERE usado_em IS NULL;
CREATE INDEX idx_perfis_aluno_curso ON perfis_aluno (curso);

CREATE INDEX idx_equipes_etapa ON equipes (etapa_atual_id) WHERE excluida_em IS NULL;
CREATE INDEX idx_equipes_mentor ON equipes (mentor_id) WHERE excluida_em IS NULL;
CREATE INDEX idx_equipes_status ON equipes (status) WHERE excluida_em IS NULL;
CREATE INDEX idx_equipes_ciclo ON equipes (ciclo_id) WHERE excluida_em IS NULL;
CREATE INDEX idx_equipes_nome_trgm ON equipes USING GIN (nome gin_trgm_ops) WHERE excluida_em IS NULL;

CREATE INDEX idx_integrantes_equipe_ativa ON integrantes_equipe (equipe_id, ativo);
CREATE INDEX idx_integrantes_usuario_ativo ON integrantes_equipe (usuario_id, ativo) WHERE usuario_id IS NOT NULL;
CREATE INDEX idx_integrantes_curso ON integrantes_equipe (curso) WHERE curso IS NOT NULL;
CREATE INDEX idx_projetos_area ON projetos (area_id);
CREATE INDEX idx_projetos_nome_trgm ON projetos USING GIN (nome gin_trgm_ops);

CREATE INDEX idx_modelos_tarefa_etapa_ativo ON modelos_tarefa (etapa_id, ativo);
CREATE INDEX idx_tarefas_equipe_status ON tarefas (equipe_id, status);
CREATE INDEX idx_tarefas_etapa_status ON tarefas (etapa_id, status);
CREATE INDEX idx_tarefas_prazo_status ON tarefas (data_entrega, status);
CREATE INDEX idx_tarefas_atraso_candidatas ON tarefas (data_entrega, equipe_id)
    WHERE status IN ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'CHANGES_REQUESTED');

CREATE INDEX idx_entregas_tarefa_data ON entregas (tarefa_id, enviado_em DESC);
CREATE INDEX idx_entregas_pendentes_revisao ON entregas (enviado_em) WHERE status_revisao = 'PENDING';
CREATE INDEX idx_arquivos_entrega_entrega ON arquivos_entrega (entrega_id);
CREATE INDEX idx_anotacoes_equipe_data ON anotacoes_mentor (equipe_id, criado_em DESC);
CREATE INDEX idx_historico_etapas_equipe_data ON historico_etapas (equipe_id, criado_em DESC);

CREATE INDEX idx_lembretes_pendentes ON lembretes_tarefa (agendado_para) WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX idx_notificacoes_pendentes ON log_notificacoes (agendada_para) WHERE status IN ('PENDING', 'FAILED');
CREATE INDEX idx_notificacoes_usuario_data ON log_notificacoes (usuario_destinatario_id, criado_em DESC);
CREATE INDEX idx_notificacoes_equipe ON log_notificacoes (equipe_id) WHERE equipe_id IS NOT NULL;
CREATE INDEX idx_notificacoes_tarefa ON log_notificacoes (tarefa_id) WHERE tarefa_id IS NOT NULL;
CREATE INDEX idx_auditoria_entidade ON log_auditoria (tipo_entidade, entidade_id, criado_em DESC);
CREATE INDEX idx_auditoria_usuario_data ON log_auditoria (usuario_id, criado_em DESC) WHERE usuario_id IS NOT NULL;

COMMIT;
