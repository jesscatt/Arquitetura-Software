# Como publicar o projeto no GitHub

## Antes de começar

Instale o GitHub Desktop e entre na sua conta. O projeto não contém senhas reais: `.env` não será publicado, enquanto `.env.example` mostra apenas os nomes das configurações.

## 1. Adicionar o projeto ao GitHub Desktop

1. Abra o GitHub Desktop.
2. Clique em **File → Add local repository**.
3. Selecione:

   ```text
   C:\Users\User\Documents\Codex\2026-08-26\files-pasted-by-the-user-atue
   ```

4. Confirme em **Add repository**.

## 2. Criar o primeiro commit

1. Confira a lista de arquivos à esquerda.
2. No campo **Summary**, escreva:

   ```text
   Protótipo inicial do InfoHub
   ```

3. Clique em **Commit to main**.

## 3. Publicar o repositório

1. Clique em **Publish repository**.
2. Use o nome:

   ```text
   infohub-inovamf
   ```

3. Descrição sugerida:

   ```text
   Sistema de acompanhamento da jornada empreendedora do InfoHub ao InovAMF.
   ```

4. Para usar GitHub Pages gratuitamente, deixe o repositório público, desmarcando **Keep this code private**.
5. Clique em **Publish Repository**.

## 4. Ativar o GitHub Pages

1. Abra o repositório no site do GitHub.
2. Entre em **Settings → Pages**.
3. Em **Build and deployment → Source**, escolha **GitHub Actions**.
4. Abra a aba **Actions** do repositório.
5. Selecione **Publicar frontend no GitHub Pages**.
6. Aguarde o processo ficar verde. Se ele não iniciar automaticamente, clique em **Run workflow → Run workflow**.

O endereço aparecerá no resumo da execução e também em **Settings → Pages**. Normalmente será:

```text
https://SEU-USUARIO.github.io/infohub-inovamf/
```

## 5. Atualizações futuras

Edite os arquivos, volte ao GitHub Desktop, escreva uma mensagem em **Summary**, clique em **Commit to main** e depois em **Push origin**. Alterações em `frontend/` serão publicadas automaticamente.

## O que compartilhar

- link do repositório: código, banco e documentação;
- link do GitHub Pages: protótipo navegável;
- `database/docs/api-contract.md`: contrato que será usado pelo futuro backend.

## Acesso do protótipo

```text
E-mail: admin@infohub.edu.br
Senha: demo1234
```

O login e os dados são simulados. O frontend não acessa diretamente o PostgreSQL.
