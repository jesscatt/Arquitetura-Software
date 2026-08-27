# Protótipo frontend

Protótipo estático do painel administrativo do InfoHub. Não existe conexão direta com PostgreSQL e nenhum backend foi implementado.

Os dados e chamadas assíncronas estão em `mock-api.js`. A futura API poderá substituir esse arquivo mantendo os mesmos objetos em camelCase.

## Executar localmente

Na raiz do projeto:

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 4173 --directory frontend
```

Abra `http://localhost:4173`.

## Acesso de demonstração

- E-mail: `admin@infohub.edu.br`
- Senha: `demo1234`

O login aceita qualquer e-mail e senha não vazios porque é somente uma simulação local.
