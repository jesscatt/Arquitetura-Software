# InfoHub — frontend conectado ao PostgreSQL

O painel usa a API REST do backend em vez do `mock-api.js`. O backend serve este front-end na mesma aplicação, evitando problemas de CORS e mantendo o acesso ao PostgreSQL centralizado.

## Subir o projeto completo

Na pasta `infohub`:

```powershell
docker compose up --build
```

Depois abra:

- `http://localhost:3000` — aplicação
- `http://localhost:3000/health` — teste da conexão com o banco
- `http://localhost:5050` — pgAdmin

### Acesso inicial

- E-mail: `admin@infohub.com`
- Senha: `demo1234`

A senha de demonstração é armazenada no banco usando `scrypt`. Para produção, substitua a conta de demonstração e implemente autenticação/sessão com token real.

## Banco de dados

O PostgreSQL é criado pelo `docker-compose.yml` com:

- Banco: `infohub`
- Usuário: `infohub`
- Porta: `5432`

O schema inicial está em `db/init.sql`.

**Importante:** scripts em `/docker-entrypoint-initdb.d` só são executados quando o volume do PostgreSQL é criado pela primeira vez. Se você já tinha subido o projeto antes e quer aplicar o `init.sql` novo, recrie o volume:

```powershell
docker compose down -v
docker compose up --build
```

Isso apaga os dados do volume local do PostgreSQL.

## Paleta visual

A interface foi ajustada para a paleta enviada no projeto:

- Vermelho principal: `#E63323`
- Laranja: `#F57C00`
- Laranja claro: `#FFB300`
- Vermelho escuro: `#C62828`
- Vinho / marrom escuro: `#4A0E1E`
- Cinza escuro (texto): `#666666`

O `mock-api.js` foi mantido no projeto apenas como referência, mas não é mais usado pelo painel conectado.
