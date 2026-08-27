\set ON_ERROR_STOP on
BEGIN;

INSERT INTO ciclos_programa (id, nome, ano, semestre, data_inicio, data_fim)
VALUES ('40000000-0000-4000-8000-000000000001', 'Validação 2026/2', 2026, 2, '2026-08-01', '2026-12-20');

INSERT INTO usuarios (id, nome, email, senha_hash, tipo, consentimento_privacidade_em, versao_politica_privacidade)
VALUES
('50000000-0000-4000-8000-000000000001', 'Administrador Teste', 'admin.teste@infohub.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'ADMIN', CURRENT_TIMESTAMP, 'test-v1'),
('50000000-0000-4000-8000-000000000002', 'Mentor Teste', 'mentor.teste@infohub.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'MENTOR', CURRENT_TIMESTAMP, 'test-v1'),
('50000000-0000-4000-8000-000000000003', 'Aluno Teste', 'aluno.teste@infohub.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'STUDENT', CURRENT_TIMESTAMP, 'test-v1');

INSERT INTO perfis_aluno (usuario_id, curso, semestre)
VALUES ('50000000-0000-4000-8000-000000000003', 'Administração', 3);

INSERT INTO equipes (id, nome, etapa_atual_id, mentor_id, ciclo_id)
VALUES ('60000000-0000-4000-8000-000000000001', 'Equipe Validação',
        '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002',
        '40000000-0000-4000-8000-000000000001');

INSERT INTO integrantes_equipe (equipe_id, usuario_id, nome, curso, semestre, papel_na_equipe)
VALUES
('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', 'Aluno Teste', 'Administração', 3, 'LEADER'),
('60000000-0000-4000-8000-000000000001', NULL, 'Integrante Sem Login', 'Engenharia de Software', 2, 'MEMBER');

INSERT INTO projetos (id, equipe_id, nome, descricao_inicial, area_id, estagio_desenvolvimento)
VALUES ('62000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001',
        'Projeto Validação', 'Descrição inicial usada no teste integrado do banco.',
        '20000000-0000-4000-8000-000000000001', 'PROTOTYPE');

INSERT INTO tarefas (id, equipe_id, etapa_id, modelo_tarefa_id, titulo, descricao, data_entrega, status, criado_por)
VALUES ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
        'Tarefa de validação', 'Enviar o artefato para validação.', CURRENT_TIMESTAMP - INTERVAL '1 day',
        'SUBMITTED', '50000000-0000-4000-8000-000000000001');

INSERT INTO entregas (id, tarefa_id, enviado_por, numero_versao, comentario_aluno)
VALUES
('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', 1, 'Primeira versão.'),
('71000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', 2, 'Segunda versão.');

INSERT INTO arquivos_entrega (entrega_id, nome_original, chave_armazenamento, tipo_mime, tamanho_bytes)
VALUES ('71000000-0000-4000-8000-000000000001', 'canvas-v1.pdf', 'test/canvas-v1.pdf', 'application/pdf', 1024);
INSERT INTO arquivos_entrega (entrega_id, url_externa)
VALUES ('71000000-0000-4000-8000-000000000002', 'https://example.test/pitch');

INSERT INTO historico_etapas (equipe_id, etapa_anterior_id, etapa_nova_id, alterado_por, motivo, alteracao_manual)
VALUES
('60000000-0000-4000-8000-000000000001', NULL, '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Entrada no funil', FALSE),
('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'Contato confirmado', TRUE);

UPDATE equipes SET etapa_atual_id = '10000000-0000-4000-8000-000000000002'
WHERE id = '60000000-0000-4000-8000-000000000001';

DO $$
DECLARE total INTEGER;
BEGIN
    SELECT count(*) INTO total FROM entregas WHERE tarefa_id = '70000000-0000-4000-8000-000000000001';
    IF total <> 2 THEN RAISE EXCEPTION 'Versionamento inválido: %', total; END IF;
    SELECT count(*) INTO total FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    IF total <> 19 THEN RAISE EXCEPTION 'Esperadas 19 tabelas, encontradas %', total; END IF;
END $$;

DO $$ BEGIN
    BEGIN
        INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES ('Duplicado', 'aluno.teste@infohub.local', '$2b$12$01234567890123456789012345678901234567890123456789012', 'STUDENT');
        RAISE EXCEPTION 'UNIQUE de e-mail ausente';
    EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

DO $$ BEGIN
    BEGIN
        INSERT INTO equipes (nome, etapa_atual_id) VALUES ('FK inválida', 'ffffffff-ffff-4fff-8fff-ffffffffffff');
        RAISE EXCEPTION 'FK de etapa ausente';
    EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;

DO $$ BEGIN
    BEGIN
        UPDATE tarefas SET status = 'INVALID' WHERE id = '70000000-0000-4000-8000-000000000001';
        RAISE EXCEPTION 'CHECK de status ausente';
    EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

DO $$ BEGIN
    BEGIN
        INSERT INTO equipes (nome, etapa_atual_id) VALUES (NULL, '10000000-0000-4000-8000-000000000001');
        RAISE EXCEPTION 'NOT NULL de nome ausente';
    EXCEPTION WHEN not_null_violation THEN NULL; END;
END $$;

DO $$ BEGIN
    BEGIN
        INSERT INTO entregas (tarefa_id, enviado_por, numero_versao)
        VALUES ('70000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', 2);
        RAISE EXCEPTION 'UNIQUE de versão ausente';
    EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

\echo 'Executando queries de dashboard...'
\ir ../queries/dashboard.sql
ROLLBACK;
\echo 'OK: smoke test concluído; dados de teste revertidos.'
