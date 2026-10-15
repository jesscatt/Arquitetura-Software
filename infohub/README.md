# InfoHub

## Rodar em qualquer computador

Só precisa do **Node.js 18 ou mais novo** (https://nodejs.org, versão LTS).
Não precisa instalar Postgres, Docker nem mudar configurações do computador.

- **Windows:** dê dois cliques em `INICIAR-WINDOWS.bat`.
- **macOS / Linux:** no terminal, dentro desta pasta: `sh iniciar.sh`.
- **Manual:** `cd backend`, `npm install`, `npm start`.

O navegador abre em http://localhost:3000.
Login de demonstração: `admin@infohub.com` / `demo1234`.

Na primeira vez, o `npm install` baixa as dependências, inclusive um Postgres
embutido, e o sistema cria o banco sozinho em `backend/.dados/`. Para zerar
o banco, feche o sistema e apague essa pasta.

## Publicar no Coolify (demo)

Um único resource (front e back juntos):

1. New Resource > repositório do GitHub > Build Pack **Dockerfile**.
2. Base Directory: `/infohub/backend` (onde fica o `Dockerfile`). Porta: `3000`.
3. Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | dados do banco do professor |
| `DB_USER`, `DB_PASSWORD` | usuário da dupla |
| `DB_SCHEMA` | schema da dupla |
| `AUTH_SECRET` | texto aleatório com 32+ caracteres |
| `APP_URL` | endereço público gerado pelo Coolify |
| `DB_SSL` | `true` só se o banco exigir SSL |

4. Deploy. No log deve aparecer `Usando o schema "..."`, `001_init.sql aplicado`
   (só na primeira vez), `002_v2.sql aplicado` e `003_g1_seed.sql aplicado`.
5. Teste em `/health`: deve responder `{"status":"ok","banco":"conectado"}`.

A cada deploy o sistema cria o schema (se não existir), as tabelas e o
cenário de demonstração. Rodar de novo não duplica dados.

### Cenário de demonstração (senha de todos: `demo1234`)

| Perfil | Login |
|---|---|
| Administrador | admin@infohub.com |
| Mentores | augusto@, marina@, rafael@, camila@infohub.com |
| Líderes | ana.lima@, bruno.alves@, carla.mendes@infohub.com |

- Projeto Aurora (líder Ana) e Projeto Nexus (líder Bruno): mentor Augusto,
  Etapa 1 aprovada, cursando a Etapa 2.
- Projeto Raiz (líder Carla): mentora Marina, com tarefa atrasada.
- Cada equipe tem 3 integrantes, sendo 1 líder.

## Usar um Postgres próprio ou publicar em outro servidor

Defina `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e
`AUTH_SECRET` (mínimo de 32 caracteres) no `backend/.env` ou no painel do
servidor. Veja `backend/.env.example`. Com `DB_HOST` definido, o banco
embutido não é usado. As tabelas são criadas automaticamente na primeira
execução.

Com Docker: `docker compose up -d --build` nesta pasta.
