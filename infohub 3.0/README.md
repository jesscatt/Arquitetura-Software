# InfoHub 1.5

## Login, primeiro acesso e reset de senha

- Contas criadas pelo administrador recebem uma **senha temporária gerada automaticamente**.
- O sistema marca a conta com `deve_alterar_senha = true`.
- No primeiro login, o usuário é bloqueado em um modal até trocar a senha.
- O administrador pode usar **↻ Resetar senha** na tela de Usuários. Isso gera uma nova senha temporária, força nova troca no próximo login e envia novo convite por e-mail.
- O convite é enviado automaticamente após a criação da conta.
- Em desenvolvimento, o Docker Compose inclui **Mailpit** para capturar os e-mails em `http://localhost:8025`, sem enviar mensagens reais.
- Para produção, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `MAIL_FROM`.

## Docker

Na pasta do projeto:

```bash
docker compose config
docker compose up --build
```

A aplicação fica em `http://localhost:3000`.

Serviços locais:
- PostgreSQL: `localhost:5432`
- InfoHub: `localhost:3000`
- Mailpit: `localhost:8025`
- pgAdmin: `localhost:5050`

### Banco já existente

O backend executa uma pequena migração idempotente no startup para adicionar as colunas de autenticação novas. Se quiser recriar o banco de demonstração do zero:

```bash
docker compose down -v
docker compose up --build
```

Isso apaga o volume PostgreSQL local.

## SMTP real

Copie `.env.example` para `.env`, preencha as credenciais SMTP e defina uma `APP_URL` acessível pelos usuários e configure um `AUTH_SECRET` aleatório com pelo menos 32 caracteres para assinar as sessões. Não coloque senhas reais no `docker-compose.yml`.

## Inicio rapido

### Sistema completo (recomendado)
No Windows, execute `INICIAR_WINDOWS.bat` ou rode `docker compose up --build`. Depois acesse `http://localhost:3000`.

### Somente interface visual
Se quiser apenas conferir a tela de login sem banco, execute `INICIAR_WINDOWS.bat` sem Docker instalado e abra `http://localhost:4173`. O login real depende do backend/PostgreSQL.

**Importante:** nao e necessario abrir `frontend/index.html` com duplo clique. Prefira um servidor local ou o Docker para evitar bloqueios do navegador.
