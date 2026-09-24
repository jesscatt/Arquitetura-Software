# InfoHub 3.1 — Sistema de Acompanhamento da Jornada do Empreendedor

Faculdade Antonio Meneghetti · InfoHub → InovAMF

Aplicação web em Node.js + PostgreSQL. O mesmo processo serve a API REST e a
interface, em uma única porta — não há build de front-end nem Docker.

```
infohub 3.0/
├── backend/
│   ├── db/002_v2.sql        migração aplicada automaticamente ao iniciar
│   ├── public/              interface servida pelo servidor (é esta que roda)
│   ├── src/                 API, modelos, serviços de e-mail e agendador
│   ├── uploads/             arquivos entregues (criado automaticamente)
│   └── .env.example         modelo de configuração
├── db/init.sql              schema inicial (instalação nova)
├── frontend/                cópia espelho de backend/public (publicação estática)
└── VALIDACAO_REQUISITOS.md  rastreabilidade com o Documento de Requisitos v1.0
```

---

## 1. Pré-requisitos

| Item | Versão | Observação |
|---|---|---|
| Node.js | 18 ou superior | `node -v` para conferir |
| PostgreSQL | 14 ou superior | pode ser local ou em servidor |
| Cliente SQL | opcional | DBeaver, pgAdmin ou `psql` |

---

## 2. Banco de dados

### 2.1 Criar banco e usuário

No `psql` conectado como superusuário (ou pelo DBeaver, aba SQL):

```sql
CREATE USER infohub WITH PASSWORD 'troque-esta-senha';
CREATE DATABASE infohub OWNER infohub;
```

### 2.2 Carregar o schema inicial

Apenas em instalação nova. Pelo terminal, na raiz do projeto:

```powershell
psql -U infohub -d infohub -f db/init.sql
```

Pelo DBeaver: abra `db/init.sql`, selecione a conexão do banco `infohub` e
execute o script inteiro.

> A migração `backend/db/002_v2.sql` (tabelas de lembretes, log de e-mails,
> áreas, configurações e colunas novas) **é aplicada sozinha** toda vez que o
> servidor sobe. Ela é idempotente: pode rodar quantas vezes for necessário.
> Se você já tinha uma base da versão anterior, não precisa recriar nada —
> basta subir o servidor.

---

## 3. Configuração

```powershell
cd backend
copy .env.example .env      # Linux/macOS: cp .env.example .env
```

Edite `backend/.env`:

```ini
DB_HOST=localhost
DB_PORT=5432
DB_NAME=infohub
DB_USER=infohub
DB_PASSWORD=troque-esta-senha

PORT=3000
APP_URL=http://localhost:3000
AUTH_SECRET=uma-string-aleatoria-com-32-caracteres-ou-mais
```

`AUTH_SECRET` é obrigatório e precisa ter **no mínimo 32 caracteres** — o
servidor recusa sessões sem isso. Para gerar uma:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### E-mail (opcional para testar, obrigatório para usar)

Sem SMTP o sistema funciona normalmente: login, cadastro, tarefas e entregas
continuam operando; apenas os e-mails falham e ficam registrados como
`falhou` na tabela `emails_log`.

Para Gmail/Google Workspace, use uma **senha de app** (não a senha da conta):

```ini
SMTP_PROVIDER=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=infohub@faculdadeam.edu.br
SMTP_PASS=sua-app-password
MAIL_FROM=InfoHub <infohub@faculdadeam.edu.br>
```

Para Microsoft 365, troque por `SMTP_PROVIDER=outlook` e
`SMTP_HOST=smtp.office365.com`.

---

## 4. Instalar e executar

```powershell
cd backend
npm install
npm start
```

Saída esperada:

```
Conectado ao Postgres com sucesso.
Migracao 002_v2.sql aplicada com sucesso.
[AGENDADOR] Rotina de lembretes ativa (a cada 30 min).
InfoHub rodando em http://localhost:3000
Inscricao publica de alunos: http://localhost:3000/inscricao.html
```

Durante o desenvolvimento, `npm run dev` reinicia o servidor a cada alteração.

---

## 5. Endereços e acesso

| Endereço | Para quem |
|---|---|
| `http://localhost:3000` | painel (administração, mentores e alunos) |
| `http://localhost:3000/inscricao.html` | formulário público de envio de ideia |
| `http://localhost:3000/health` | verificação da conexão com o banco |

Conta de demonstração criada pelo `init.sql`:

- **Administrador:** `admin@infohub.com` · senha `demo1234`
- **Mentor:** `augusto@infohub.com` · senha `demo1234`
- **Aluno:** `jessika@infohub.com` · senha `demo1234`

> Antes de colocar em produção, crie a conta real da coordenação, faça login
> com ela e desative as contas de demonstração em **Usuários**.

---

## 6. Roteiro de teste em 10 minutos

1. Abra `/inscricao.html` e envie uma ideia com um e-mail seu. A conta do aluno
   é criada e a ideia entra na Etapa 1.
2. Entre como administrador. A nova equipe aparece na coluna **Envio da ideia**.
3. Abra a equipe → **Aplicar tarefas da etapa**: as tarefas-modelo daquela etapa
   são criadas com prazo e lembretes automáticos.
4. Saia e entre com a conta do aluno → **Minhas tarefas** → **Enviar entrega**
   (arquivo ou link).
5. Volte como administrador → aba **Entregas** da equipe → **Avaliar** →
   aprovar ou solicitar ajustes. O aluno recebe o resultado por e-mail.
6. Tente **Avançar etapa** com uma tarefa obrigatória pendente: o sistema
   bloqueia e pede confirmação do mentor (RN-01).
7. Em **Relatórios**, exporte **Equipes (CSV)** e abra no Excel.

Para disparar os lembretes na hora, sem esperar o intervalo do agendador:

```powershell
cd backend
npm run lembretes
```

---

## 7. Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `AUTH_SECRET ausente ou muito curto` | `.env` não criado ou segredo curto | gerar um segredo de 32+ caracteres |
| `Tentativa 1/15 de conectar ao banco falhou` | Postgres parado ou dados errados | conferir serviço e `DB_*` no `.env` |
| `relation "perfis" does not exist` | `db/init.sql` não foi executado | executar o script do item 2.2 |
| Tela de login abre mas nada carrega | porta ocupada ou token expirado | conferir console do navegador (F12) |
| `[EMAIL] SMTP indisponível` | SMTP não configurado | normal em desenvolvimento; configurar para produção |
| Upload recusado | extensão ou tamanho | ajustar em **Configurações** (`upload.extensoes`, `upload.tamanho_max_mb`) |

---

## 8. Parâmetros ajustáveis (tabela `configuracoes`)

| Chave | Padrão | O que faz |
|---|---|---|
| `ciclo.atual` | `2026/2` | ciclo/turma aplicado às novas equipes |
| `upload.tamanho_max_mb` | `50` | limite por arquivo |
| `upload.extensoes` | `pdf,png,jpg,…` | tipos aceitos nas entregas |
| `equipe.max_integrantes` | `6` | teto de integrantes por equipe |
| `equipe.multiplas_por_aluno` | `false` | permite o aluno liderar mais de uma ideia ativa |
| `lembretes.dias_padrao` | `3,1,0` | antecedências padrão dos lembretes |
| `jornada.exigir_tarefas_obrigatorias` | `true` | bloqueio de avanço de etapa (RN-01) |

---

## 9. Backup (RNF-07)

```powershell
pg_dump -U infohub -d infohub -F c -f infohub-backup.dump
```

Faça também a cópia da pasta `backend/uploads/`, que guarda os arquivos das
entregas. A restauração usa `pg_restore -U infohub -d infohub infohub-backup.dump`.
