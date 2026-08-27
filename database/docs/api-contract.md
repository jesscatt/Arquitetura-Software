# Contrato preliminar da futura API

Este arquivo documenta os formatos usados pelos mocks do frontend. Não existe API implementada nesta etapa. O backend futuro deverá expor HTTP/JSON e nunca permitir acesso direto do navegador ao PostgreSQL.

## Convenções

- prefixo `/api`;
- JSON em `camelCase`, mesmo com banco em `snake_case` e português;
- datas em ISO 8601 com fuso;
- IDs representados como UUID;
- paginação: `page`, `pageSize`, `totalItems`;
- autenticação futura por token em `Authorization: Bearer <token>`;
- erros no formato `{ "error": { "code": "...", "message": "...", "details": [] } }`.

## Endpoints propostos

```text
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

POST   /api/students/register
GET    /api/users/me

GET    /api/journey-stages
GET    /api/project-areas
GET    /api/program-cycles

GET    /api/teams
POST   /api/teams
GET    /api/teams/{id}
PATCH  /api/teams/{id}
POST   /api/teams/{id}/stage-transitions
GET    /api/teams/{id}/tasks
POST   /api/teams/{id}/tasks
GET    /api/teams/{id}/notes
POST   /api/teams/{id}/notes

PATCH  /api/tasks/{id}
POST   /api/tasks/{id}/submissions
POST   /api/submissions/{id}/approve
POST   /api/submissions/{id}/request-changes
POST   /api/tasks/{id}/reminders

GET    /api/kanban
GET    /api/dashboard
GET    /api/reports/teams.csv
```

`GET /api/kanban` foi escolhido porque devolve diretamente o agrupamento necessário à tela administrativa, sem sobrecarregar uma listagem genérica de equipes.

## Login

`POST /api/auth/login`

Requisição:

```json
{
  "email": "admin@infohub.edu.br",
  "password": "senha-informada"
}
```

Resposta:

```json
{
  "accessToken": "token-gerado-pela-api",
  "expiresIn": 3600,
  "user": {
    "id": "8a39fa13-43d1-4f70-b4ab-096cf36bfd55",
    "name": "Alex Martins",
    "email": "admin@infohub.edu.br",
    "role": "ADMIN",
    "active": true
  }
}
```

## Cadastro inicial

`POST /api/students/register`

```json
{
  "student": {
    "name": "Ana Souza",
    "email": "ana@exemplo.com",
    "password": "senha-informada",
    "phone": "+55 55 99999-9999",
    "course": "Administração",
    "semester": 3,
    "privacyPolicyVersion": "2026-08",
    "privacyAccepted": true
  },
  "team": {
    "name": "Equipe Aurora",
    "members": [
      {
        "name": "Bruno Lima",
        "course": "Engenharia de Software",
        "semester": 2,
        "roleInTeam": "MEMBER"
      }
    ]
  },
  "project": {
    "name": "Mente Leve",
    "description": "Plataforma de apoio preventivo à saúde mental de universitários.",
    "areaId": "c453d07c-93ba-4ca1-b5b2-3c8b87a02f17",
    "developmentStage": "IDEA",
    "discoverySource": "Evento acadêmico"
  }
}
```

Resposta: `201 Created` com o objeto de detalhe da equipe.

## Usuário

```json
{
  "id": "20eab4d9-1de4-42de-a09d-83b92a85e5e2",
  "name": "Ana Souza",
  "email": "ana@exemplo.com",
  "phone": "+55 55 99999-9999",
  "role": "STUDENT",
  "active": true,
  "studentProfile": {
    "course": "Administração",
    "semester": 3
  },
  "createdAt": "2026-08-26T19:00:00-03:00"
}
```

O campo `passwordHash` nunca é retornado.

## Integrante

```json
{
  "id": "c3d91708-d1d7-42c3-9f65-b0e617189845",
  "userId": null,
  "name": "Bruno Lima",
  "course": "Engenharia de Software",
  "semester": 2,
  "roleInTeam": "MEMBER",
  "active": true,
  "joinedAt": "2026-08-26T19:00:00-03:00"
}
```

`userId: null` significa integrante cadastrado sem conta própria.

## Projeto

```json
{
  "id": "8c5d3148-815d-4967-ab52-afd730e3f22a",
  "name": "Mente Leve",
  "description": "Plataforma de apoio preventivo à saúde mental de universitários.",
  "area": {
    "id": "c453d07c-93ba-4ca1-b5b2-3c8b87a02f17",
    "name": "Saúde"
  },
  "developmentStage": "IDEA",
  "discoverySource": "Evento acadêmico"
}
```

## Etapa

```json
{
  "id": "4c188ddf-e276-49ad-b13e-0888f746d10b",
  "number": 3,
  "name": "Encontro 1 – Entendendo a ideia",
  "description": "Definição do problema, público-alvo e solução inicial.",
  "active": true
}
```

## Equipe resumida

```json
{
  "id": "a30511e7-9de8-4bfd-a249-a8035e648603",
  "name": "Aurora",
  "status": "ACTIVE",
  "currentStage": {
    "id": "4c188ddf-e276-49ad-b13e-0888f746d10b",
    "number": 3,
    "name": "Encontro 1 – Entendendo a ideia"
  },
  "mentor": {
    "id": "27361a13-aa68-4777-b07c-a95e77a42ffc",
    "name": "Mariana Lopes"
  },
  "project": {
    "id": "8c5d3148-815d-4967-ab52-afd730e3f22a",
    "name": "Mente Leve",
    "area": { "id": "c453d07c-93ba-4ca1-b5b2-3c8b87a02f17", "name": "Saúde" }
  },
  "memberCount": 3,
  "pendingTaskCount": 1
}
```

## Tarefa

```json
{
  "id": "28375794-ef8e-4587-b233-d8ad90947c5e",
  "teamId": "a30511e7-9de8-4bfd-a249-a8035e648603",
  "stage": {
    "id": "4c188ddf-e276-49ad-b13e-0888f746d10b",
    "number": 3,
    "name": "Encontro 1 – Entendendo a ideia"
  },
  "title": "Definir problema, público-alvo e solução",
  "description": "Enviar o resumo produzido após o encontro.",
  "dueDate": "2026-08-30T21:00:00-03:00",
  "status": "IN_PROGRESS",
  "required": true,
  "latestSubmissionVersion": 1,
  "createdAt": "2026-08-26T19:00:00-03:00"
}
```

## Entrega

`POST /api/tasks/{id}/submissions` usará `multipart/form-data` quando houver upload. O JSON abaixo representa a resposta:

```json
{
  "id": "0aeb85f4-d8e9-4236-ad8b-ee25f89f165e",
  "taskId": "28375794-ef8e-4587-b233-d8ad90947c5e",
  "versionNumber": 2,
  "studentComment": "Versão revisada após o retorno do mentor.",
  "reviewStatus": "PENDING",
  "submittedBy": {
    "id": "20eab4d9-1de4-42de-a09d-83b92a85e5e2",
    "name": "Ana Souza"
  },
  "files": [
    {
      "id": "8fa276c0-6bf8-4941-9988-50516ef2e4ba",
      "originalFilename": "canvas-v2.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 245301,
      "downloadUrl": "https://url-temporaria-gerada-pela-api"
    },
    {
      "id": "c0a144d3-273e-403c-99f0-dd311dd08efd",
      "externalUrl": "https://www.youtube.com/watch?v=exemplo"
    }
  ],
  "submittedAt": "2026-08-28T18:40:00-03:00"
}
```

## Detalhe da equipe

`GET /api/teams/{id}`

```json
{
  "id": "a30511e7-9de8-4bfd-a249-a8035e648603",
  "name": "Aurora",
  "status": "ACTIVE",
  "currentStage": {
    "id": "4c188ddf-e276-49ad-b13e-0888f746d10b",
    "number": 3,
    "name": "Encontro 1 – Entendendo a ideia"
  },
  "mentor": { "id": "27361a13-aa68-4777-b07c-a95e77a42ffc", "name": "Mariana Lopes" },
  "cycle": { "id": "3926bab1-1a9c-4234-98ca-c11f912c36e5", "name": "InfoHub 2026/2" },
  "project": {
    "id": "8c5d3148-815d-4967-ab52-afd730e3f22a",
    "name": "Mente Leve",
    "description": "Plataforma de apoio preventivo à saúde mental de universitários.",
    "area": { "id": "c453d07c-93ba-4ca1-b5b2-3c8b87a02f17", "name": "Saúde" },
    "developmentStage": "PROTOTYPE"
  },
  "members": [
    {
      "id": "e07bb149-282c-488d-be00-c2fd3d36d2b2",
      "userId": "20eab4d9-1de4-42de-a09d-83b92a85e5e2",
      "name": "Ana Souza",
      "course": "Administração",
      "semester": 3,
      "roleInTeam": "LEADER",
      "active": true
    }
  ],
  "tasks": [],
  "stageHistory": [
    {
      "fromStage": { "number": 2, "name": "Contato com a equipe" },
      "toStage": { "number": 3, "name": "Encontro 1 – Entendendo a ideia" },
      "changedBy": { "id": "27361a13-aa68-4777-b07c-a95e77a42ffc", "name": "Mariana Lopes" },
      "reason": "Tarefas obrigatórias aprovadas",
      "manualOverride": false,
      "createdAt": "2026-08-25T16:20:00-03:00"
    }
  ],
  "createdAt": "2026-08-10T09:30:00-03:00",
  "updatedAt": "2026-08-26T18:30:00-03:00"
}
```

Anotações internas só entram nessa resposta para ADMIN ou MENTOR autorizado.

## Kanban

`GET /api/kanban?cycleId={uuid}&mentorId={uuid}&areaId={uuid}&search=aurora`

```json
{
  "cycle": { "id": "3926bab1-1a9c-4234-98ca-c11f912c36e5", "name": "InfoHub 2026/2" },
  "stages": [
    {
      "stage": { "id": "1d26bebb-ad8b-4467-90a2-c56686fac181", "number": 1, "name": "Envio da ideia" },
      "teamCount": 1,
      "teams": [
        {
          "id": "a30511e7-9de8-4bfd-a249-a8035e648603",
          "name": "Aurora",
          "status": "ACTIVE",
          "project": { "id": "8c5d3148-815d-4967-ab52-afd730e3f22a", "name": "Mente Leve", "areaName": "Saúde" },
          "mentor": { "id": "27361a13-aa68-4777-b07c-a95e77a42ffc", "name": "Mariana Lopes" },
          "memberCount": 3,
          "pendingTaskCount": 1,
          "hasOverdueTasks": false
        }
      ]
    },
    {
      "stage": { "id": "4b99ef09-0928-4be9-bf23-f666540fdfd8", "number": 2, "name": "Contato com a equipe" },
      "teamCount": 0,
      "teams": []
    }
  ]
}
```

A resposta real sempre incluirá as seis etapas ativas, mesmo quando não houver equipes.

## Dashboard

`GET /api/dashboard?cycleId={uuid}`

```json
{
  "activeTeams": 7,
  "overdueTasks": 2,
  "readyForInovamf": 1,
  "pendingTasks": 8,
  "mentors": 3,
  "teamsByStage": [
    { "stageNumber": 1, "stageName": "Envio da ideia", "teamCount": 2 },
    { "stageNumber": 2, "stageName": "Contato com a equipe", "teamCount": 1 },
    { "stageNumber": 3, "stageName": "Encontro 1 – Entendendo a ideia", "teamCount": 1 },
    { "stageNumber": 4, "stageName": "Encontro 2 – Proposta de valor", "teamCount": 1 },
    { "stageNumber": 5, "stageName": "Encontro 3 – Modelo de negócio", "teamCount": 2 },
    { "stageNumber": 6, "stageName": "Encontro 4 – Pitch e inscrição", "teamCount": 1 }
  ],
  "teamsByArea": [
    { "areaName": "Tecnologia", "teamCount": 2 },
    { "areaName": "Educação", "teamCount": 2 },
    { "areaName": "Saúde", "teamCount": 2 },
    { "areaName": "Sustentabilidade", "teamCount": 2 }
  ]
}
```

## Correspondência com o protótipo

`frontend/mock-api.js` reproduz `login`, `dashboard`, `kanban`, detalhe de equipe, tarefas e avanço de etapa. Quando o backend existir, o frontend deve trocar essa implementação por chamadas HTTP preservando esses formatos.
