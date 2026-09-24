# Validação do sistema contra o Documento de Requisitos v1.0

InfoHub → InovAMF · Faculdade Antonio Meneghetti · versão do sistema: 3.1

Legenda: **Atendido** = implementado e disponível na interface · **Parcial** =
funciona pela API, mas a tela ainda é básica · **Fora de escopo** = declarado
como tal no próprio documento.

---

## 1. Objetivos

| ID | Objetivo | Situação | Onde está |
|---|---|---|---|
| OBJ-01 | Centralizar cadastro de alunos/equipes e ideias | Atendido | `/inscricao.html`, seção **Equipes** |
| OBJ-02 | Visibilidade da etapa de cada equipe | Atendido | Kanban de 6 colunas, aba **Jornada** |
| OBJ-03 | Atribuir tarefas/prazos e receber entregáveis | Atendido | **Tarefas**, **Minhas tarefas**, aba **Entregas** |
| OBJ-04 | Lembretes automáticos por e-mail | Atendido | `services/agendador.js` + `services/notificacoes.js` |
| OBJ-05 | Visão consolidada do funil | Atendido | **Visão geral**, **Relatórios**, `/relatorios/dashboard` |

---

## 2. Requisitos funcionais

### 2.1 Cadastro e autenticação

| ID | Requisito | Situação | Observação |
|---|---|---|---|
| RF-01 | Login separado admin/aluno + recuperação de senha | Atendido | Login único com perfis distintos; recuperação por link de uso único válido por 1 hora. O botão da tela de login estava apenas simulando o envio — foi corrigido |
| RF-02 | Aluno se cadastra pelo formulário, criando a conta | Atendido | **Era a maior lacuna.** Criado `/inscricao.html` + `POST /inscricao` |
| RF-03 | Admin cria/edita/desativa admin e mentor | Atendido | **Usuários**; protege o último administrador ativo |

### 2.2 Formulário inicial (Etapa 1)

| Campo exigido | Situação |
|---|---|
| Nome completo do aluno | Atendido |
| E-mail e telefone/WhatsApp | Atendido (colunas `telefone` adicionadas) |
| Curso e semestre/período | Atendido (colunas `curso`, `semestre` adicionadas) |
| Nome e curso de cada colega (repetível) | Atendido — linhas dinâmicas, limite configurável |
| Nome da ideia/projeto | Atendido |
| Descrição inicial | Atendido |
| Área/setor configurável | Atendido — tabela `areas_ideia`, editável pelo administrador |
| Estágio atual | Atendido |
| Como conheceu o InfoHub | Atendido (opcional) |

| ID | Requisito | Situação |
|---|---|---|
| RF-04 | Validar obrigatórios antes de enviar | Atendido — validação no navegador e no servidor |
| RF-05 | Criar registro na Etapa 1 e avisar o admin | Atendido — transação única + e-mail a todos os administradores |

### 2.3 Painel do administrador

| ID | Requisito | Situação | Observação |
|---|---|---|---|
| RF-06 | Funil/kanban por etapa | Atendido | Já existia |
| RF-07 | Busca e filtros | Parcial | Tela tem busca, área e mentor; a API aceita também ciclo, etapa, status e texto. Filtro por curso não implementado |
| RF-08 | Detalhe da equipe | Atendido | Abas: visão geral, integrantes, tarefas, entregas, jornada, anotações |
| RF-09 | Avançar/retroceder etapa manualmente | Atendido | Com registro no histórico |
| RF-10 | Anotações internas do mentor | Atendido | Restritas a admin/mentor; o aluno não tem rota de acesso |

### 2.4 Tarefas e prazos

| ID | Requisito | Situação | Observação |
|---|---|---|---|
| RF-11 | Tarefas avulsas ou por modelo de etapa | Atendido | 7 modelos pré-carregados; botão "Aplicar tarefas da etapa" |
| RF-12 | Campos da tarefa e status | Atendido | Acrescentado o campo "entrega obrigatória" |
| RF-13 | Aluno vê tarefas pendentes e concluídas | Atendido | Seção **Minhas tarefas** |
| RF-14 | Anexar um ou mais arquivos, ou link | Atendido | Upload binário + link externo; cada envio é uma versão |
| RF-15 | Aprovar ou solicitar ajustes com comentário | Atendido | Parecer obrigatório ao solicitar ajustes; a tarefa reabre |
| RF-16 | Histórico de versões dos arquivos | Atendido | Campo `versao`; nenhuma versão é sobrescrita |

### 2.5 Lembretes e notificações

| ID | Requisito | Situação | Observação |
|---|---|---|---|
| RF-17 | Datas de lembrete configuráveis por tarefa | Atendido | Padrão 3/1/0 dias, ajustável na criação e depois |
| RF-18 | E-mails ao aluno (atribuição, prazo próximo, vencido, avaliação) | Atendido | Quatro gatilhos implementados |
| RF-19 | E-mails ao admin (cadastro, entrega, atraso) | Atendido | Três gatilhos implementados |
| RF-20 | Lembrete manual avulso | Atendido | Botão **Enviar lembrete** no detalhe da equipe |
| RF-21 | Preferências de notificação (desejável) | Atendido na API | `PATCH /auth/preferencias`; sem tela ainda |

### 2.6 Relatórios

| ID | Requisito | Situação | Observação |
|---|---|---|---|
| RF-22 | Dashboard com indicadores | Atendido | Equipes ativas, atrasadas, aguardando avaliação, prontas para o InovAMF, distribuição por etapa e área |
| RF-23 | Exportação em CSV/Excel | Atendido | Equipes e tarefas, com BOM e ponto e vírgula (abre direto no Excel em português) |
| RF-24 | Filtro por período/turma | Atendido | Campo `ciclo` + filtros por data de criação na API |

---

## 3. Requisitos não funcionais

| ID | Requisito | Situação | Observação |
|---|---|---|---|
| RNF-01 | Navegador, layout responsivo | Atendido | Já existia; formulário público também é responsivo |
| RNF-02 | LGPD | Parcial | Consentimento obrigatório e datado no cadastro. **Falta definir** com a coordenação a política de retenção e a rotina de exclusão a pedido |
| RNF-03 | Controle de acesso por escopo | Atendido | Aluno vê só a própria equipe; mentor, só as suas |
| RNF-04 | Armazenamento seguro, limite e tipos | Atendido | Fora da pasta pública, download só autenticado, 50 MB e lista de extensões configuráveis |
| RNF-05 | Auditoria | Atendido | Escrita, login, mudança de etapa e todos os e-mails |
| RNF-06 | E-mail confiável com reenvio | Atendido | Três tentativas com espera crescente; falhas registradas |
| RNF-07 | Backup e recuperação | Parcial | Procedimento documentado no README. **Falta** a rotina agendada no servidor da instituição |

---

## 4. Regras de negócio

| ID | Regra | Situação |
|---|---|---|
| RN-01 | Só avança de etapa com as tarefas obrigatórias aprovadas | Atendido — bloqueio com confirmação registrada quando o mentor decide avançar mesmo assim |
| RN-02 | Entregáveis obrigatórios da Etapa 6 | Atendido — modelos obrigatórios de BMC, VPD, Pitch e dados dos integrantes; "Pronta para o InovAMF" só com todos aprovados |
| RN-03 | Um aluno em uma única equipe ativa | Atendido — controlado por `equipe.multiplas_por_aluno` |
| RN-04 | Tarefas vencidas viram "atrasadas" | Atendido — agendador a cada 30 minutos |

---

## 5. Perguntas em aberto (seção 9 do documento)

| ID | Pergunta | Como foi resolvido | Precisa da coordenação? |
|---|---|---|---|
| Q1 | Integrante tem login próprio? | Sim. O perfil "Integrante" já existe e tem acesso de leitura e envio de entregas da própria equipe. Colegas cadastrados sem conta ficam apenas como registro | Não, mas vale confirmar se todos devem receber convite |
| Q2 | Mentor tem perfil próprio? | Sim, restrito às equipes sob sua mentoria | Não |
| Q3 | Pitch Vídeo: arquivo ou link? | Os dois. Arquivo até o limite configurado ou link do YouTube/Drive | Recomenda-se padronizar por link, para não estourar o armazenamento |
| Q4 | Aluno em mais de uma ideia? | Configurável. Padrão: **não** | Sim — confirmar a decisão |
| Q5 | Máximo de integrantes? | Configurável. Padrão: **6** | Sim — confirmar o número |
| Q6 | Etapa pós-InovAMF? | Não implementado, conforme o documento. O status "encaminhada_inovamf" já existe como ponto de partida | Sim, se quiserem na v2 |
| Q7 | Qual serviço de e-mail? | SMTP configurável (Gmail/Workspace, Microsoft 365 ou domínio próprio) | Sim — informar a conta institucional |

---

## 6. Fora de escopo (confirmado)

- Submissão automática ao edital do InovAMF
- Lembretes por WhatsApp
- Agendamento e videochamada integrados
- Integração com o sistema acadêmico

---

## 7. Pendências para a próxima iteração

1. Telas de administração para áreas, modelos de tarefa e parâmetros do sistema — hoje só pela API (`/configuracoes`).
2. Tela de preferências de notificação do usuário (RF-21).
3. Filtro por curso no painel (RF-07).
4. Política de retenção e rotina de exclusão de dados (RNF-02).
5. Backup agendado no servidor da instituição (RNF-07).
6. Testes automatizados — o projeto ainda não tem suíte de testes.

---

## 8. Sobre a identidade visual

A identidade visual original do sistema foi **preservada**: a ilustração
animada da tela de acesso, o bloco "Bem-Vindo / Vamos Começar?", os avatares
ilustrados e as mensagens do painel continuam exatamente como estavam.

As telas novas (área do aluno, entregas, anotações e lembretes) e o formulário
público de inscrição seguem a mesma paleta e o mesmo logotipo do restante do
sistema.
