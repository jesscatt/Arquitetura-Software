-- InfoHub → InovAMF
-- Arquivo de conveniência para psql. A fonte versionada está em database/migrations/.
-- O modelo inicial da equipe permanece preservado em database/legacy/Tabelas_original.sql.

\set ON_ERROR_STOP on

\ir database/migrations/V001__extensoes.sql
\ir database/migrations/V002__usuarios.sql
\ir database/migrations/V003__perfis_aluno.sql
\ir database/migrations/V004__ciclos_programa.sql
\ir database/migrations/V005__etapas_jornada.sql
\ir database/migrations/V006__areas_projeto.sql
\ir database/migrations/V007__equipes.sql
\ir database/migrations/V008__integrantes_equipe.sql
\ir database/migrations/V009__projetos.sql
\ir database/migrations/V010__modelos_tarefa.sql
\ir database/migrations/V011__tarefas.sql
\ir database/migrations/V012__entregas.sql
\ir database/migrations/V013__arquivos_entrega.sql
\ir database/migrations/V014__anotacoes_mentor.sql
\ir database/migrations/V015__historico_etapas.sql
\ir database/migrations/V016__lembretes_tarefa.sql
\ir database/migrations/V017__notificacoes.sql
\ir database/migrations/V018__auditoria.sql
\ir database/migrations/V019__indices.sql

\ir database/seeds/01_etapas_jornada.sql
\ir database/seeds/02_areas_projeto.sql
\ir database/seeds/03_modelos_tarefa.sql
