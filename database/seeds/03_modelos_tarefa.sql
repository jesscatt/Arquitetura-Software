BEGIN;

INSERT INTO modelos_tarefa (id, etapa_id, titulo, descricao, obrigatoria, ativo)
SELECT dados.id::UUID, etapa.id, dados.titulo, dados.descricao, TRUE, TRUE
FROM (VALUES
    ('30000000-0000-4000-8000-000000000001', 1, 'Completar cadastro da ideia', 'Revisar os dados da equipe e o esboço inicial da ideia.'),
    ('30000000-0000-4000-8000-000000000002', 2, 'Confirmar primeiro encontro', 'Confirmar data e disponibilidade da equipe.'),
    ('30000000-0000-4000-8000-000000000003', 3, 'Definir problema, público-alvo e solução', 'Registrar as definições do primeiro encontro.'),
    ('30000000-0000-4000-8000-000000000004', 4, 'Enviar Value Proposition Design', 'Enviar a versão atual do Value Proposition Design.'),
    ('30000000-0000-4000-8000-000000000005', 5, 'Enviar Business Model Canvas', 'Enviar a versão atual do Business Model Canvas.'),
    ('30000000-0000-4000-8000-000000000006', 6, 'Enviar Pitch Vídeo', 'Enviar arquivo ou link externo do Pitch Vídeo.'),
    ('30000000-0000-4000-8000-000000000007', 6, 'Enviar Canvas final', 'Enviar a versão final do Business Model Canvas.'),
    ('30000000-0000-4000-8000-000000000008', 6, 'Enviar VPD final', 'Enviar a versão final do Value Proposition Design.'),
    ('30000000-0000-4000-8000-000000000009', 6, 'Conferir dados dos integrantes', 'Conferir todos os integrantes antes do encaminhamento.')
) AS dados(id, numero_etapa, titulo, descricao)
JOIN etapas_jornada etapa ON etapa.numero_etapa = dados.numero_etapa
ON CONFLICT (etapa_id, titulo) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    obrigatoria = EXCLUDED.obrigatoria,
    ativo = EXCLUDED.ativo;

COMMIT;
