-- 1. Total de equipes ativas
SELECT count(*) AS total_equipes_ativas
FROM equipes
WHERE status = 'ACTIVE' AND excluida_em IS NULL;

-- 2. Equipes por etapa, incluindo etapas vazias
SELECT etapa.id AS etapa_id, etapa.numero_etapa, etapa.nome AS etapa_nome, count(equipe.id) AS quantidade_equipes
FROM etapas_jornada etapa
LEFT JOIN equipes equipe ON equipe.etapa_atual_id = etapa.id AND equipe.excluida_em IS NULL
GROUP BY etapa.id, etapa.numero_etapa, etapa.nome
ORDER BY etapa.numero_etapa;

-- 3. Equipes por área
SELECT area.id AS area_id, area.nome AS area_nome, count(equipe.id) AS quantidade_equipes
FROM areas_projeto area
LEFT JOIN projetos projeto ON projeto.area_id = area.id
LEFT JOIN equipes equipe ON equipe.id = projeto.equipe_id AND equipe.excluida_em IS NULL
GROUP BY area.id, area.nome
ORDER BY quantidade_equipes DESC, area.nome;

-- 4. Equipes por ciclo
SELECT ciclo.id AS ciclo_id, ciclo.nome AS ciclo_nome, ciclo.ano, ciclo.semestre, count(equipe.id) AS quantidade_equipes
FROM ciclos_programa ciclo
LEFT JOIN equipes equipe ON equipe.ciclo_id = ciclo.id AND equipe.excluida_em IS NULL
GROUP BY ciclo.id, ciclo.nome, ciclo.ano, ciclo.semestre
ORDER BY ciclo.ano DESC, ciclo.semestre DESC;

-- 5. Tarefas atrasadas em tempo real; a futura API deve persistir OVERDUE periodicamente
SELECT tarefa.id AS tarefa_id, tarefa.titulo, tarefa.data_entrega, tarefa.status,
       equipe.id AS equipe_id, equipe.nome AS equipe_nome
FROM tarefas tarefa
JOIN equipes equipe ON equipe.id = tarefa.equipe_id
WHERE tarefa.data_entrega < CURRENT_TIMESTAMP
  AND tarefa.status IN ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'CHANGES_REQUESTED')
  AND equipe.excluida_em IS NULL
ORDER BY tarefa.data_entrega;

-- 6. Equipes prontas ou encaminhadas ao InovAMF
SELECT equipe.id, equipe.nome, equipe.status, equipe.concluida_em, projeto.nome AS projeto_nome
FROM equipes equipe
LEFT JOIN projetos projeto ON projeto.equipe_id = equipe.id
WHERE equipe.status IN ('READY_FOR_INOVAMF', 'REFERRED_TO_INOVAMF')
  AND equipe.excluida_em IS NULL
ORDER BY equipe.concluida_em DESC NULLS LAST, equipe.nome;

-- 7. Quantidade de tarefas ainda não aprovadas
SELECT count(*) AS quantidade_tarefas_pendentes
FROM tarefas tarefa
JOIN equipes equipe ON equipe.id = tarefa.equipe_id
WHERE tarefa.status IN ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'OVERDUE', 'CHANGES_REQUESTED')
  AND equipe.excluida_em IS NULL;

-- 8. Quantidade de equipes por mentor, incluindo mentor sem equipe
SELECT usuario.id AS mentor_id, usuario.nome AS mentor_nome, count(equipe.id) AS quantidade_equipes
FROM usuarios usuario
LEFT JOIN equipes equipe ON equipe.mentor_id = usuario.id AND equipe.excluida_em IS NULL
WHERE usuario.tipo = 'MENTOR' AND usuario.ativo = TRUE AND usuario.excluido_em IS NULL
GROUP BY usuario.id, usuario.nome
ORDER BY quantidade_equipes DESC, usuario.nome;
