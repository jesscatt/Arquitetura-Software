# InfoHub → InovAMF

Projeto acadêmico da disciplina de Organização e Arquitetura de Software para acompanhamento da jornada empreendedora do InfoHub ao InovAMF.

## Conteúdo

- banco PostgreSQL organizado em 19 migrations;
- seeds das seis etapas, áreas e modelos de tarefas;
- consultas de dashboard e smoke test;
- documentação do modelo, diagrama ER e contrato da futura API;
- protótipo frontend com login demonstrativo, indicadores, Kanban, filtros e detalhe de equipe;
- publicação automática do frontend pelo GitHub Pages.

## Protótipo frontend

O frontend usa dados simulados em `frontend/mock-api.js`. Não existe backend e o navegador não acessa diretamente o PostgreSQL.

Para executar localmente:

```powershell
python -m http.server 4173 --directory frontend
```

Acesse `http://localhost:4173`:

```text
E-mail: admin@infohub.edu.br
Senha: demo1234
```

## Banco de dados

1. Copie `.env.example` para `.env`.
2. Troque a senha de exemplo.
3. Execute:

```bash
docker compose up --detach --wait
docker compose exec -T postgres sh /workspace/database/scripts/test.sh
```

As migrations e seeds são executadas automaticamente na primeira criação do volume.

## Documentação

- `database/docs/database-model.md`: tabelas, decisões e diagrama ER;
- `database/docs/api-contract.md`: formatos JSON usados pelos mocks e pela futura API;

## Trabalho original preservado

O primeiro modelo de tabelas produzido pela equipe está preservado em `database/legacy/Tabelas_original.sql`. O arquivo `Tabelas.sql` na raiz executa a estrutura corrigida e os seeds oficiais em ordem.
