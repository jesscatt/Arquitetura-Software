BEGIN;

INSERT INTO etapas_jornada (id, numero_etapa, nome, descricao, ativa)
VALUES
    ('10000000-0000-4000-8000-000000000001', 1, 'Envio da ideia', 'Cadastro inicial da equipe e da ideia/projeto.', TRUE),
    ('10000000-0000-4000-8000-000000000002', 2, 'Contato com a equipe', 'Análise da proposta e confirmação do primeiro encontro.', TRUE),
    ('10000000-0000-4000-8000-000000000003', 3, 'Encontro 1 – Entendendo a ideia', 'Definição do problema, público-alvo e solução inicial.', TRUE),
    ('10000000-0000-4000-8000-000000000004', 4, 'Encontro 2 – Proposta de valor', 'Construção do Value Proposition Design.', TRUE),
    ('10000000-0000-4000-8000-000000000005', 5, 'Encontro 3 – Modelo de negócio', 'Construção do Business Model Canvas.', TRUE),
    ('10000000-0000-4000-8000-000000000006', 6, 'Encontro 4 – Pitch e inscrição', 'Revisão final, Pitch Vídeo e materiais para o InovAMF.', TRUE)
ON CONFLICT (numero_etapa) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    ativa = EXCLUDED.ativa;

COMMIT;
