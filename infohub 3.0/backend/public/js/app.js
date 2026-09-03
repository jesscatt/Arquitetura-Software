const API = "";
const SESSION_STORAGE_KEY = "infohub_access_token";

const $ = (selector) => document.querySelector(selector);
const elements = {
  loginScreen: $("#loginScreen"),
  loginForm: $("#loginForm"),
  appShell: $("#appShell"),
  statsGrid: $("#statsGrid"),
  kanban: $("#kanban"),
  deadlineList: $("#deadlineList"),
  searchInput: $("#searchInput"),
  areaFilter: $("#areaFilter"),
  mentorFilter: $("#mentorFilter"),
  clearFilters: $("#clearFilters"),
  dialog: $("#teamDialog"),
  dialogContent: $("#teamDialogContent"),
  toast: $("#toast"),
  sidebar: $("#sidebar"),
  dashboardContent: $("#dashboardContent"),
  workspaceView: $("#workspaceView"),
};

const stages = [
  { number: 1, name: "Envio da ideia", shortName: "Ideia" },
  { number: 2, name: "Contato com a equipe", shortName: "Contato" },
  { number: 3, name: "Encontro 1 – Entendendo a ideia", shortName: "Encontro 1" },
  { number: 4, name: "Encontro 2 – Proposta de valor", shortName: "Encontro 2" },
  { number: 5, name: "Encontro 3 – Modelo de negócio", shortName: "Encontro 3" },
  { number: 6, name: "Encontro 4 – Pitch e inscrição", shortName: "Encontro 4" },
];

const statusLabels = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  entregue: "Entregue",
  atrasada: "Atrasada",
  aprovada: "Aprovada",
  reprovada: "Reprovada",
};

const stageLabels = Object.fromEntries(stages.map((stage) => [stage.number, stage.name]));
let cache = { equipes: [], tarefas: [], usuarios: [] };
let currentUser = null;
let currentSection = "dashboard";
let currentSettingsTab = "users";
let currentView = "kanban";
let accessToken = sessionStorage.getItem(SESSION_STORAGE_KEY) || null;
function can(permission){ return currentUser?.role === "admin" || (currentUser?.permissions || []).includes(permission); }
function applyNavigationPermissions(){ const map={teams:"equipes.visualizar",tasks:"tarefas.visualizar",reports:"relatorios.visualizar",settings:"configuracoes.visualizar",users:"usuarios.visualizar",profiles:"usuarios.visualizar"}; document.querySelectorAll(".nav-item").forEach(btn=>{const p=map[btn.dataset.section]; if(p) btn.classList.toggle("visible",can(p));}); }

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function closeActiveDialog() {
  document.querySelectorAll("dialog[open]").forEach((dialog) => {
    try { dialog.close(); } catch (_) {}
  });
}

function closeAllOverlays() {
  closeActiveDialog();
  const dropdown = $("#userMenuDropdown");
  const menu = $("#userMenu");
  const trigger = $("#userMenuTrigger");
  dropdown?.classList.add("is-hidden");
  menu?.classList.remove("is-open");
  trigger?.setAttribute("aria-expanded", "false");
}

function showDialogAlert(message, type = "error") {
  const dialog = document.querySelector("dialog[open]");
  if (!dialog) return false;
  const content = dialog.querySelector("[id$='DialogContent'], .dialog-content") || dialog.firstElementChild || dialog;
  let alert = dialog.querySelector(".dialog-alert");
  if (!alert) {
    alert = document.createElement("div");
    alert.className = "dialog-alert";
    content.prepend(alert);
  }
  alert.className = `dialog-alert ${type === "success" ? "dialog-alert-success" : "dialog-alert-error"}`;
  alert.innerHTML = `<strong>${type === "success" ? "Sucesso" : "Atenção"}</strong><span>${escapeHtml(String(message || "Ocorreu um erro."))}</span><button type="button" aria-label="Fechar aviso">×</button>`;
  alert.querySelector("button")?.addEventListener("click", () => alert.remove());
  alert.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return true;
}

function clearDialogAlert() { document.querySelector("dialog[open] .dialog-alert")?.remove(); }

function showToast(message) {
  // Alertas de uma ação feita dentro de um modal devem permanecer no modal,
  // nunca atrás dele no canto inferior da tela.
  if (showDialogAlert(message)) return;
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 3000);
}

function setLoading(button, loading, label = "Carregando…") {
  if (!button) return;
  button.disabled = loading;
  button.dataset.originalText ||= button.innerHTML;
  button.innerHTML = loading ? label : button.dataset.originalText;
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && accessToken) {
      doLogout();
      throw new Error(data?.erro || "Sua sessão expirou. Faça login novamente.");
    }
    throw new Error(data?.erro || data?.detalhe || `Erro ${response.status}`);
  }
  return data;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${String(value).slice(0, 10)}T12:00:00`));
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "—";
}

const extinctAnimals = [
  { file: "preguica-gigante.svg", label: "Preguiça-gigante" },
  { file: "gliptodonte.svg", label: "Gliptodonte" },
  { file: "macrauchenia.svg", label: "Macrauquênia" },
  { file: "smilodon.svg", label: "Smilodon" },
  { file: "toxodonte.svg", label: "Toxodonte" },
];

function avatarMarkup(name = "", id = "", className = "mini-avatar") {
  const key = `${id}-${name}`.split("").reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 7);
  const animal = extinctAnimals[key % extinctAnimals.length];
  return `<span class="${className} animal-avatar" title="${animal.label}"><img src="./assets/animals/${animal.file}" alt="${animal.label}" /><span class="avatar-fallback">${initials(name)}</span></span>`;
}

function normalizeTeam(equipe) {
  const tarefas = cache.tarefas.filter((t) => Number(t.equipeId) === Number(equipe.id));
  const members = equipe.integrantes?.length
    ? equipe.integrantes.map((member) => ({
        id: member.id,
        name: member.nome,
        course: member.curso,
        roleInTeam: member.nome === equipe.lider?.nome ? "LEADER" : "MEMBER",
      }))
    : equipe.lider
      ? [{ id: `leader-${equipe.lider.id}`, name: equipe.lider.nome, course: "Líder da equipe", roleInTeam: "LEADER" }]
      : [];

  const stage = stages[Math.max(0, Math.min(5, Number(equipe.etapaAtual || 1) - 1))];
  return {
    id: equipe.id,
    name: equipe.nomeProjeto,
    status: equipe.status,
    currentStage: stage,
    mentor: equipe.mentor ? { id: equipe.mentor.id, name: equipe.mentor.nome } : { id: null, name: "Sem mentor" },
    project: {
      id: equipe.id,
      name: equipe.nomeProjeto,
      description: equipe.descricaoInicial,
      area: { id: equipe.areaSetor, name: equipe.areaSetor },
      developmentStage: equipe.estagioAtual,
    },
    members,
    tasks: tarefas.map((task) => ({ id: task.id, title: task.titulo, status: task.status, dueDate: task.dataEntrega, etapa: task.etapaRelacionada })),
  };
}

async function refreshData() {
  const requests = [api("/equipes"), api("/tarefas")];
  if (can("usuarios.visualizar")) requests.push(api("/usuarios"));
  const [equipes, tarefas, usuarios] = await Promise.all(requests);
  cache = { equipes, tarefas, usuarios: usuarios || cache.usuarios || [] };
}

function renderDashboard() {
  const allTasks = cache.tarefas;
  const activeTeams = cache.equipes.filter((e) => e.status === "ativa").length;
  const readyForInovamf = cache.equipes.filter((e) => ["pronta_inovamf", "encaminhada_inovamf"].includes(e.status)).length;
  const mentors = new Set(cache.equipes.map((e) => e.mentorId).filter(Boolean)).size;
  const pendingTasks = allTasks.filter((t) => !["aprovada", "entregue"].includes(t.status)).length;
  const cards = [
    ["Equipes ativas", activeTeams, "no ciclo atual", "accent-red"],
    ["Tarefas atrasadas", allTasks.filter((t) => t.status === "atrasada").length, "pedem atenção", "accent-orange"],
    ["Prontas para o InovAMF", readyForInovamf, "com materiais aprovados", "accent-wine"],
    ["Mentores ativos", mentors, "acompanhando equipes", "accent-gold"],
  ];
  elements.statsGrid.innerHTML = cards.map(([label, value, note, tone], index) => `
    <article class="stat-card ${tone}"><div class="stat-number">${String(value).padStart(2, "0")}</div><div><h3>${label}</h3><p>${note}</p></div><span class="stat-index">0${index + 1}</span></article>
  `).join("");
  $("#teamNavCount").textContent = activeTeams;
  $("#taskNavCount").textContent = pendingTasks;
}

function teamCard(item) {
  const pending = item.tasks.filter((task) => !["aprovada", "entregue"].includes(task.status)).length;
  const hasOverdue = item.tasks.some((task) => task.status === "atrasada");
  return `<button class="team-card" type="button" data-team-id="${item.id}" aria-label="Abrir equipe ${escapeHtml(item.name)}">
    <div class="team-card-top"><span class="area-tag">${escapeHtml(item.project.area.name)}</span><span class="more">•••</span></div>
    <h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.project.description)}</p><div class="card-divider"></div>
    <div class="mentor-row">${avatarMarkup(item.mentor.name, item.mentor.id)}<span>${escapeHtml(item.mentor.name)}</span></div>
    <div class="card-meta"><span>${item.members.length} ${item.members.length === 1 ? "integrante" : "integrantes"}</span><span class="${hasOverdue ? "danger" : ""}">${pending} ${pending === 1 ? "pendência" : "pendências"}</span></div>
  </button>`;
}

function bindTeamButtons() {
  document.querySelectorAll("[data-team-id]").forEach((button) => button.addEventListener("click", () => openTeam(button.dataset.teamId)));
}

function renderKanban() {
  const query = elements.searchInput.value.trim().toLocaleLowerCase("pt-BR");
  const area = elements.areaFilter.value;
  const mentor = elements.mentorFilter.value;
  const teams = cache.equipes.filter((e) => {
    const text = `${e.nomeProjeto} ${e.descricaoInicial}`.toLocaleLowerCase("pt-BR");
    return (!query || text.includes(query)) && (!area || e.areaSetor === area) && (!mentor || (e.mentor?.nome || "") === mentor);
  }).map(normalizeTeam);

  if (currentView === "list") {
    elements.kanban.innerHTML = `<div class="team-list-view">${teams.length ? teams.map((team) => `
      <button class="team-list-item" type="button" data-team-id="${team.id}"><span class="mini-avatar">${initials(team.name)}</span><span><strong>${escapeHtml(team.name)}</strong><small>${escapeHtml(team.project.area.name)} · Etapa ${team.currentStage.number} · ${escapeHtml(team.mentor.name)}</small></span><span class="status-pill">${escapeHtml(team.status)}</span><span>→</span></button>
    `).join("") : '<div class="empty-column">Nenhuma equipe encontrada.</div>'}</div>`;
  } else {
    elements.kanban.innerHTML = stages.map((stage) => {
      const stageTeams = teams.filter((team) => team.currentStage.number === stage.number);
      return `<section class="kanban-column" aria-labelledby="stage-${stage.number}"><header><div class="stage-number">${String(stage.number).padStart(2, "0")}</div><div><h3 id="stage-${stage.number}">${stage.shortName}</h3><p>${stage.name}</p></div><span class="team-count">${stageTeams.length}</span></header><div class="column-body">${stageTeams.length ? stageTeams.map(teamCard).join("") : '<div class="empty-column">Nenhuma equipe</div>'}</div></section>`;
    }).join("");
  }
  bindTeamButtons();
}

function renderDeadlines() {
  const tasks = [...cache.tarefas].filter((task) => !["aprovada", "entregue"].includes(task.status)).sort((a, b) => new Date(a.dataEntrega) - new Date(b.dataEntrega)).slice(0, 4).map((task) => ({ ...task, team: cache.equipes.find((e) => Number(e.id) === Number(task.equipeId)) })).filter((task) => task.team);
  elements.deadlineList.innerHTML = tasks.length ? tasks.map((task) => `<button class="deadline-item" type="button" data-deadline-team="${task.team.id}"><span class="deadline-date"><strong>${formatDate(task.dataEntrega).split(" ")[0]}</strong>${formatDate(task.dataEntrega).split(" ")[1] || ""}</span><span class="deadline-main"><strong>${escapeHtml(task.titulo)}</strong><small>${escapeHtml(task.team.nomeProjeto)}</small></span><span class="status-pill status-${task.status}">${statusLabels[task.status] || task.status}</span><span>→</span></button>`).join("") : '<div class="loading-state">Nenhum prazo pendente.</div>';
  document.querySelectorAll("[data-deadline-team]").forEach((button) => button.addEventListener("click", () => openTeam(button.dataset.deadlineTeam)));
}

function populateFilters() {
  const areas = [...new Set(cache.equipes.map((e) => e.areaSetor).filter(Boolean))].sort();
  const mentors = [...new Set(cache.equipes.map((e) => e.mentor?.nome).filter(Boolean))].sort();
  elements.areaFilter.innerHTML = '<option value="">Todas as áreas</option>' + areas.map((area) => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`).join("");
  elements.mentorFilter.innerHTML = '<option value="">Todos os mentores</option>' + mentors.map((mentor) => `<option value="${escapeHtml(mentor)}">${escapeHtml(mentor)}</option>`).join("");
}

async function updateTaskStatus(taskId, status) {
  await api(`/tarefas/${taskId}`, { method: "PATCH", body: JSON.stringify({ status }) });
  await refreshData();
  renderDashboard();
  renderKanban();
  renderDeadlines();
  showToast("Status da tarefa atualizado no PostgreSQL.");
}

async function openTeam(id) {
  closeActiveDialog();
  const equipe = cache.equipes.find((item) => String(item.id) === String(id));
  if (!equipe) return showToast("Equipe não encontrada.");
  const item = normalizeTeam(equipe);
  const progress = Math.round((item.currentStage.number / 6) * 100);

  const renderTab = (tab) => {
    const tasks = item.tasks || [];
    if (tab === "members") return `<section class="modal-panel"><div class="modal-section-heading"><div><span class="eyebrow">EQUIPE</span><h3>Integrantes</h3><p>Alunos vinculados a esta equipe.</p></div>${can("equipes.editar") ? '<button class="secondary-button small-button" id="addMemberButton" type="button">＋ Adicionar integrante</button>' : ""}</div><div class="modal-member-grid">${item.members.map((member) => `<article class="modal-member-card">${avatarMarkup(member.name, member.id, "member-avatar")}<div><strong>${escapeHtml(member.name)}</strong><small>${escapeHtml(member.course || "Curso não informado")}</small></div><span class="member-role ${member.roleInTeam === "LEADER" ? "leader" : ""}">${member.roleInTeam === "LEADER" ? "Líder" : "Integrante"}</span></article>`).join("") || '<div class="settings-empty compact"><div class="settings-empty-icon">＋</div><h2>Nenhum integrante</h2><p>Adicione os alunos que fazem parte desta equipe.</p></div>'}</div></section>`;
    if (tab === "tasks") return `<section class="modal-panel"><div class="modal-section-heading"><div><span class="eyebrow">OPERAÇÃO</span><h3>Tarefas da equipe</h3><p>Acompanhe prazos e andamento das atividades.</p></div>${can("tarefas.criar") ? '<button class="secondary-button small-button" id="addTaskButton" type="button">＋ Nova tarefa</button>' : ""}</div><div class="modal-task-list">${tasks.map((task) => `<article class="modal-task-row"><div class="task-icon">✓</div><div class="modal-task-main"><strong>${escapeHtml(task.title)}</strong><small>Etapa ${task.etapa} · Prazo ${formatDate(task.dueDate)}</small></div><select class="task-status-select" data-task-id="${task.id}" ${can("tarefas.editar") ? "" : "disabled"}>${Object.entries(statusLabels).map(([key,label]) => `<option value="${key}" ${key === task.status ? "selected" : ""}>${label}</option>`).join("")}</select></article>`).join("") || '<div class="settings-empty compact"><div class="settings-empty-icon">✓</div><h2>Nenhuma tarefa</h2><p>Esta equipe ainda não possui tarefas atribuídas.</p></div>'}</div></section>`;
    if (tab === "deliveries") return `<section class="modal-panel"><div class="modal-section-heading"><div><span class="eyebrow">ENTREGAS</span><h3>Entregas e documentos</h3><p>Materiais produzidos durante a jornada.</p></div></div><div class="delivery-placeholder"><div class="delivery-icon">↥</div><div><strong>Entregas desta equipe</strong><p>Os arquivos enviados e suas avaliações aparecerão aqui conforme as etapas forem concluídas.</p></div><span class="status-pill status-pendente">Em acompanhamento</span></div></section>`;
    if (tab === "journey") return `<section class="modal-panel"><div class="modal-section-heading"><div><span class="eyebrow">JORNADA</span><h3>Progresso por etapa</h3><p>Histórico visual da evolução da equipe.</p></div></div><div class="journey-timeline">${stages.map(stage => `<div class="journey-step ${stage.number < item.currentStage.number ? "done" : stage.number === item.currentStage.number ? "current" : ""}"><span>${stage.number < item.currentStage.number ? "✓" : String(stage.number).padStart(2,"0")}</span><div><strong>${escapeHtml(stage.name)}</strong><small>${stage.number < item.currentStage.number ? "Concluída" : stage.number === item.currentStage.number ? "Etapa atual" : "Próxima etapa"}</small></div></div>`).join("")}</div></section>`;
    return `<section class="modal-panel"><div class="modal-section-heading"><div><span class="eyebrow">VISÃO GERAL</span><h3>Projeto</h3><p>Resumo das informações principais desta equipe.</p></div></div><div class="overview-grid"><div class="overview-description"><span>Descrição da ideia</span><p>${escapeHtml(item.project.description || "Sem descrição cadastrada.")}</p></div><div class="overview-facts"><div><span>Área</span><strong>${escapeHtml(item.project.area.name || "—")}</strong></div><div><span>Mentor</span><strong>${escapeHtml(item.mentor.name)}</strong></div><div><span>Estágio</span><strong>${escapeHtml((item.project.developmentStage || "—").replaceAll("_", " "))}</strong></div><div><span>Integrantes</span><strong>${item.members.length}</strong></div></div></div></section>`;
  };

  const setTab = (tab) => {
    elements.dialogContent.querySelectorAll(".team-modal-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
    const body = elements.dialogContent.querySelector("#teamModalTabContent");
    body.innerHTML = renderTab(tab);
    body.querySelectorAll(".task-status-select").forEach(select => select.addEventListener("change", async () => {
      try { select.disabled = true; await updateTaskStatus(select.dataset.taskId, select.value); closeActiveDialog(); } catch (error) { showToast(error.message); } finally { select.disabled = false; }
    }));
    body.querySelector("#addMemberButton")?.addEventListener("click", () => showToast("Cadastro de integrante será aberto nesta equipe."));
    body.querySelector("#addTaskButton")?.addEventListener("click", () => showToast("Cadastro de tarefa será aberto nesta equipe."));
  };

  elements.dialogContent.innerHTML = `<header class="dialog-header team-modal-header"><div><span class="eyebrow">DETALHE DA EQUIPE</span><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.project.name)} · ${escapeHtml(item.project.area.name)}</p></div><button class="close-button" id="closeDialog" type="button" aria-label="Fechar">×</button></header>
    <div class="team-modal-summary"><div class="journey-progress"><div><span>Etapa ${item.currentStage.number} de 6</span><strong>${escapeHtml(item.currentStage.name)}</strong></div><div class="progress-track"><i style="width:${progress}%"></i></div></div><div class="team-summary-stats"><div><span>Mentor</span><strong>${escapeHtml(item.mentor.name)}</strong></div><div><span>Integrantes</span><strong>${item.members.length}</strong></div><div><span>Tarefas</span><strong>${item.tasks.length}</strong></div></div></div>
    <nav class="team-modal-tabs" aria-label="Detalhes da equipe"><button class="team-modal-tab active" data-tab="overview" type="button">Visão geral</button><button class="team-modal-tab" data-tab="members" type="button">Integrantes <b>${item.members.length}</b></button><button class="team-modal-tab" data-tab="tasks" type="button">Tarefas <b>${item.tasks.length}</b></button><button class="team-modal-tab" data-tab="deliveries" type="button">Entregas</button><button class="team-modal-tab" data-tab="journey" type="button">Jornada</button></nav>
    <div class="dialog-body team-modal-body" id="teamModalTabContent"></div>
    <footer class="dialog-footer"><span>Equipe #${escapeHtml(item.id)}</span><div class="dialog-actions"><button class="secondary-button" id="cancelDialog" type="button">Fechar</button><button class="primary-button" id="advanceButton" type="button" ${item.currentStage.number >= 6 || !can("jornada.avancar") ? "disabled" : ""}>Avançar para próxima etapa →</button></div></footer>`;

  elements.dialog.showModal();
  $("#closeDialog").addEventListener("click", () => elements.dialog.close());
  $("#cancelDialog")?.addEventListener("click", () => elements.dialog.close());
  elements.dialogContent.querySelectorAll(".team-modal-tab").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
  setTab("overview");
  $("#advanceButton")?.addEventListener("click", async (event) => {
    const button = event.currentTarget; setLoading(button, true);
    try { const nextStage = Math.min(6, item.currentStage.number + 1); const payload = { etapaAtual: nextStage }; if (nextStage === 6) payload.status = "pronta_inovamf"; await api(`/equipes/${item.id}`, { method: "PATCH", body: JSON.stringify(payload) }); await refreshData(); elements.dialog.close(); renderDashboard(); renderKanban(); renderDeadlines(); showToast(`${item.name} avançou para a etapa ${nextStage}.`); } catch (error) { showToast(error.message); } finally { setLoading(button, false); }
  });
}

function showSection(section) {
  closeAllOverlays();
  currentSection = section;
  if (section === "users") currentSettingsTab = "users";
  if (section === "profiles") currentSettingsTab = "profiles";
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.section === section));
  elements.dashboardContent.classList.toggle("is-hidden", section !== "dashboard");
  elements.workspaceView.classList.toggle("is-hidden", section === "dashboard");
  if (section === "dashboard") {
    $("#pageTitle").textContent = "Visão geral da jornada";
    return;
  }
  $("#pageTitle").textContent = section === "teams" ? "Equipes" : section === "tasks" ? "Tarefas" : section === "reports" ? "Relatórios" : section === "users" ? "Usuários" : section === "profiles" ? "Perfis e permissões" : "Administração";
  renderWorkspace(section);
  elements.sidebar.classList.remove("open");
}

function renderWorkspace(section) {
  if (section === "teams") return renderTeamsPage();
  if (section === "tasks") return renderTasksPage();
  if (section === "settings") return renderSettingsPage(currentSettingsTab);
  if (section === "users") return renderSettingsPage("users");
  if (section === "profiles") return renderSettingsPage("profiles");
  renderReportsPage();
}

function renderTeamsPage() {
  const teams = cache.equipes.map(normalizeTeam);
  elements.workspaceView.innerHTML = `<div class="workspace-heading"><div><span class="eyebrow">GESTÃO</span><h2>Equipes</h2><p>${teams.length} equipe(s) cadastrada(s) no banco.</p></div><button class="primary-button ${can("equipes.criar")?"":"is-hidden"}" id="workspaceNewTeam">＋ Nova equipe</button></div><div class="data-table">${teams.map((team) => `<div class="data-row"><div><strong>${escapeHtml(team.name)}</strong><small>${escapeHtml(team.project.description)}</small></div><span>${escapeHtml(team.project.area.name)}</span><span>Etapa ${team.currentStage.number}</span><span>${escapeHtml(team.mentor.name)}</span><button class="secondary-button small-button" type="button" data-team-id="${team.id}">Abrir</button></div>`).join("") || '<div class="empty-column">Nenhuma equipe cadastrada.</div>'}</div>`;
  $("#workspaceNewTeam")?.addEventListener("click", openNewTeamDialog);
  bindTeamButtons();
}

function renderTasksPage() {
  const tasks = [...cache.tarefas].sort((a, b) => new Date(a.dataEntrega) - new Date(b.dataEntrega));
  elements.workspaceView.innerHTML = `<div class="workspace-heading"><div><span class="eyebrow">OPERAÇÃO</span><h2>Tarefas</h2><p>Altere o status e acompanhe os prazos diretamente no PostgreSQL.</p></div><button class="primary-button ${can("tarefas.criar")?"":"is-hidden"}" id="workspaceNewTask">＋ Nova tarefa</button></div><div class="data-table task-table">${tasks.map((task) => { const team = cache.equipes.find((e) => Number(e.id) === Number(task.equipeId)); return `<div class="data-row"><div><strong>${escapeHtml(task.titulo)}</strong><small>${escapeHtml(team?.nomeProjeto || "Equipe removida")} · ${escapeHtml(task.descricao || "Sem descrição")}</small></div><span>${formatDate(task.dataEntrega)}</span><span>Etapa ${task.etapaRelacionada}</span><select class="task-status-select" data-task-id="${task.id}" ${can("tarefas.editar")?"":"disabled"}>${Object.entries(statusLabels).map(([key, label]) => `<option value="${key}" ${key === task.status ? "selected" : ""}>${label}</option>`).join("")}</select></div>`; }).join("") || '<div class="empty-column">Nenhuma tarefa cadastrada.</div>'}</div>`;
  document.querySelectorAll(".task-status-select").forEach((select) => select.addEventListener("change", async () => { try { select.disabled = true; await updateTaskStatus(select.dataset.taskId, select.value); renderTasksPage(); } catch (error) { showToast(error.message); } finally { select.disabled = false; } }));
  $("#workspaceNewTask")?.addEventListener("click", openNewTaskDialog);
}

function renderSettingsPage(initialTab = currentSettingsTab){
  currentSettingsTab = initialTab;
  if(!can("usuarios.visualizar")){
    elements.workspaceView.innerHTML=`<div class="settings-empty"><div class="settings-empty-icon">⌁</div><span class="eyebrow">CONFIGURAÇÕES</span><h2>Acesso restrito</h2><p>Seu perfil não possui permissão para acessar esta área.</p></div>`;
    return;
  }
  const users=cache.usuarios||[];
  const active=users.filter(u=>u.ativo!==false).length;
  const inactive=users.length-active;
  const settingsTitle = currentSettingsTab === "profiles" ? "Perfis e permissões" : "Usuários";
  const settingsDescription = currentSettingsTab === "profiles" ? "Defina exatamente o que cada perfil pode fazer no InfoHub." : "Gerencie contas, acessos, perfis e status dos usuários.";
  elements.workspaceView.innerHTML=`
    <div class="settings-hero">
      <div>
        <div class="settings-breadcrumb"><span>Administração</span><b>›</b><strong>${settingsTitle}</strong></div>
        <div class="workspace-heading settings-heading"><div><span class="eyebrow">CENTRAL DE ADMINISTRAÇÃO</span><h2>${settingsTitle}</h2><p>${settingsDescription}</p></div>${currentSettingsTab === "users" ? '<button class="primary-button" id="newUserButton">＋ Novo usuário</button>' : ''}</div>
      </div>
    </div>
    <div class="settings-nav">
      <button class="settings-nav-item active" data-settings-tab="users"><span class="settings-nav-icon">♙</span><span><strong>Usuários</strong><small>${users.length} contas cadastradas</small></span></button>
      <button class="settings-nav-item" data-settings-tab="profiles"><span class="settings-nav-icon">◈</span><span><strong>Perfis e permissões</strong><small>Defina o que cada perfil pode fazer</small></span></button>
    </div>
    <section id="settingsPanel" class="settings-panel"></section>`;
  if (currentSettingsTab === "profiles") {
    document.querySelectorAll("[data-settings-tab]").forEach(x=>x.classList.toggle("active",x.dataset.settingsTab === "profiles"));
    renderProfilesPanel();
  } else {
    renderUsersPanel();
  }
  document.querySelectorAll("[data-settings-tab]").forEach(b=>b.addEventListener("click",()=>{
    currentSettingsTab = b.dataset.settingsTab;
    $("#pageTitle").textContent = currentSettingsTab === "profiles" ? "Perfis e permissões" : "Usuários";
    document.querySelectorAll("[data-settings-tab]").forEach(x=>x.classList.toggle("active",x===b));
    if(b.dataset.settingsTab==='users') renderUsersPanel(); else renderProfilesPanel();
  }));
  $("#newUserButton").addEventListener("click",()=>openNewUserDialog());
}
function renderUsersPanel(){
 const users=cache.usuarios||[];
 const active=users.filter(u=>u.ativo!==false).length;
 const inactive=users.length-active;
 const admins=users.filter(u=>u.tipo==='admin').length;
 const mentors=users.filter(u=>u.tipo==='mentor').length;
 const visible=users;
 $("#settingsPanel").innerHTML=`
   <div class="settings-email-card" id="settingsEmailCard"><div><strong>Entrega de e-mails</strong><small id="emailStatusText">Verificando conexão SMTP…</small></div><div style="display:flex;align-items:center;gap:8px"><span class="email-status" id="emailStatusBadge">Verificando…</span><button class="secondary-button small-button" id="testEmailButton" type="button">Enviar teste</button></div></div>
   <div class="settings-metrics">
     <article><span class="metric-icon">♙</span><div><strong>${users.length}</strong><small>Total de usuários</small></div></article>
     <article><span class="metric-icon success">✓</span><div><strong>${active}</strong><small>Contas ativas</small></div></article>
     <article><span class="metric-icon warning">◷</span><div><strong>${inactive}</strong><small>Contas inativas</small></div></article>
     <article><span class="metric-icon accent">◆</span><div><strong>${admins+mentors}</strong><small>Gestores e mentores</small></div></article>
   </div>
   <div class="settings-toolbar">
     <div><h3>Usuários do sistema</h3><p>Gerencie acesso, perfil e status das contas.</p></div>
     <div class="settings-actions"><label class="settings-search"><span>⌕</span><input id="userSearch" type="search" placeholder="Buscar por nome ou e-mail…"></label><select id="userRoleFilter"><option value="">Todos os perfis</option><option value="admin">Administrador</option><option value="mentor">Mentor</option><option value="aluno">Aluno líder</option><option value="integrante">Integrante</option></select><select id="userStatusFilter"><option value="">Todos os status</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></div>
   </div>
   <div class="users-card">
     <div class="users-table-head"><span>USUÁRIO</span><span>PERFIL</span><span>STATUS</span><span>ÚLTIMO ACESSO</span><span></span></div>
     <div id="usersRows">${renderUserRows(visible)}</div>
   </div>`;
 const rerender=()=>{const q=(document.querySelector('#userSearch')?.value||'').toLowerCase().trim();const role=document.querySelector('#userRoleFilter')?.value||'';const status=document.querySelector('#userStatusFilter')?.value||'';const filtered=users.filter(u=>(!q||`${u.nome||''} ${u.email||''}`.toLowerCase().includes(q))&&(!role||u.tipo===role)&&(!status||(status==='active'?u.ativo!==false:u.ativo===false)));document.querySelector('#usersRows').innerHTML=renderUserRows(filtered);bindUserActions();};
 ['#userSearch','#userRoleFilter','#userStatusFilter'].forEach(sel=>document.querySelector(sel)?.addEventListener(sel.includes('Search')?'input':'change',rerender));
 bindUserActions();
 const emailStatusText=$("#emailStatusText"), emailStatusBadge=$("#emailStatusBadge"), testEmailButton=$("#testEmailButton");
 api("/usuarios/meta/email-status").then(status=>{
   emailStatusText.textContent=status.usingMailpit ? `Modo de testes ativo · SMTP ${status.host}:${status.port} · veja as mensagens no Mailpit` : `SMTP configurado em ${status.host}:${status.port}`;
   emailStatusBadge.textContent="Conectado";
 }).catch(()=>{ emailStatusText.textContent="SMTP indisponível. Configure o servidor de e-mail para enviar convites."; emailStatusBadge.textContent="Indisponível"; emailStatusBadge.classList.add("off"); });
 testEmailButton?.addEventListener("click",async()=>{ try{ setLoading(testEmailButton,true,"Enviando…"); const r=await api("/usuarios/meta/test-email",{method:"POST",body:JSON.stringify({email:currentUser.email})}); showToast(r.mensagem); }catch(err){showToast(err.message);}finally{setLoading(testEmailButton,false);} });
}
function renderUserRows(users){
 if(!users.length)return '<div class="settings-no-results"><span>⌕</span><strong>Nenhum usuário encontrado</strong><small>Tente ajustar os filtros ou cadastre um novo usuário.</small></div>';
 return users.map(u=>`<div class="user-table-row"><div class="user-main">${avatarMarkup(u.nome, u.id, "user-avatar-large")}<span><strong>${escapeHtml(u.nome)}</strong><small>${escapeHtml(u.email)}</small></span></div><div><span class="role-badge role-${escapeHtml(u.tipo||'integrante')}">${escapeHtml(u.perfil?.nome || roleLabel(u.tipo))}</span></div><div><span class="status-pill ${u.ativo?'status-active':'status-inactive'}"><i></i>${u.ativo?'Ativo':'Inativo'}</span></div><div class="last-access"><strong>${u.ultimoAcesso ? formatDate(u.ultimoAcesso) : 'Ainda não acessou'}</strong><small>${u.ultimoAcesso ? 'Acesso registrado' : 'Conta criada recentemente'}</small></div><div class="user-row-actions"><button class="icon-action" title="Editar usuário" data-edit-user="${u.id}">✎</button>${Number(u.id)!==Number(currentUser.id)&&u.ativo?`<button class="icon-action" title="Resetar senha e reenviar convite" data-reset-user="${u.id}">↻</button>`:""}<button class="icon-action ${u.ativo?'danger':''}" title="${u.ativo?'Desativar':'Ativar'} usuário" data-toggle-user="${u.id}" ${Number(u.id)===Number(currentUser.id)?'disabled':''}>${u.ativo?'⊘':'✓'}</button></div></div>`).join('');
}
function bindUserActions(){
 document.querySelectorAll('[data-edit-user]').forEach(b=>b.onclick=()=>openEditUserDialog(b.dataset.editUser));
 document.querySelectorAll('[data-toggle-user]').forEach(b=>b.onclick=()=>toggleUser(b.dataset.toggleUser));
 document.querySelectorAll('[data-reset-user]').forEach(b=>b.onclick=()=>resetUser(b.dataset.resetUser));
}
function roleLabel(t){return ({admin:'Administrador',mentor:'Mentor',aluno:'Aluno líder',integrante:'Integrante'})[t]||t;}
async function loadProfiles(){return api('/usuarios/meta/perfis');}
function openNewUserDialog(user=null){
  closeActiveDialog();
  const editing=!!user;
  elements.dialogContent.innerHTML = `<div class="dialog-loading">Carregando perfis de acesso…</div>`;
  elements.dialog.showModal();
  loadProfiles().then(profiles=>{
    const allowedProfiles = profiles.filter(p => ["Administrador","Mentor","Aluno líder","Integrante"].includes(p.nome));
    if (!allowedProfiles.length) throw new Error("Nenhum perfil de acesso foi encontrado no banco de dados.");
    elements.dialogContent.innerHTML=`<header class="dialog-header"><div><span class="eyebrow">${editing?'EDITAR USUÁRIO':'NOVO USUÁRIO'}</span><h2>${editing?'Editar usuário':'Criar usuário'}</h2><p>${editing?'Atualize os dados e o nível de acesso desta conta.':'Cadastre a pessoa. O InfoHub gera a senha temporária e envia o convite por e-mail.'}</p></div><button class="close-button" id="closeDialog" type="button">×</button></header><form class="form-body" id="userForm"><div class="form-section-title"><span>01</span><div><strong>Dados da conta</strong><small>Nome e e-mail usados para identificação e acesso.</small></div></div><div class="form-grid"><label>Nome completo<input name="nome" required maxlength="150" value="${escapeHtml(user?.nome||'')}" placeholder="Ex.: Maria Silva"></label><label>E-mail<input name="email" type="email" required value="${escapeHtml(user?.email||'')}" placeholder="nome@empresa.com"></label></div>${editing?'<label>Nova senha <small>(opcional)</small><input name="senha" type="password" minlength="6" placeholder="Deixe em branco para manter a senha atual"></label>':'<div class="info-callout"><strong>Senha temporária automática</strong><small>O sistema vai gerar uma senha segura e enviá-la no convite. No primeiro acesso, a pessoa será obrigada a criar uma nova senha.</small></div>'}<div class="form-section-title"><span>02</span><div><strong>Perfil de acesso</strong><small>O perfil determina as permissões desta conta.</small></div></div><label>Perfil de acesso<select name="perfilId" required>${allowedProfiles.map(p=>`<option value="${p.id}" data-profile-name="${escapeHtml(p.nome)}" ${Number(user?.perfilId)===Number(p.id)?'selected':''}>${escapeHtml(p.nome)}${p.descricao?` — ${escapeHtml(p.descricao)}`:''}</option>`).join('')}</select><small>Disponíveis: Administrador, Mentor, Aluno líder e Integrante.</small></label><label class="check-label"><input type="checkbox" name="ativo" ${user?.ativo!==false?'checked':''}> <span><strong>Usuário ativo</strong><small>Permite que esta conta entre no sistema.</small></span></label><footer class="dialog-footer"><span>${editing?'As alterações são aplicadas imediatamente.':'Ao criar, o convite será enviado automaticamente.'}</span><div class="dialog-actions"><button class="secondary-button" id="cancelDialog" type="button">Cancelar</button><button class="primary-button" type="submit">${editing?'Salvar alterações':'Criar usuário'}</button></div></footer></form>`;
    clearDialogAlert();
    $("#closeDialog").addEventListener('click',()=>elements.dialog.close());
    $("#cancelDialog")?.addEventListener('click',()=>elements.dialog.close());
    $("#userForm").addEventListener('submit',async e=>{
      e.preventDefault();
      clearDialogAlert();
      const form=e.currentTarget, button=form.querySelector('button[type=submit]');
      const data=Object.fromEntries(new FormData(form).entries());
      data.ativo=form.ativo.checked;
      const perfilIdNumber=Number(data.perfilId);
      const selectedProfile=form.perfilId.options[form.perfilId.selectedIndex];
      if(!Number.isInteger(perfilIdNumber)||perfilIdNumber<=0){ showDialogAlert("Selecione um perfil de acesso válido."); return; }
      data.perfilId=perfilIdNumber;
      data.perfilNome=selectedProfile?.dataset.profileName || selectedProfile?.textContent?.split(" — ")[0] || "";
      if(!data.senha) delete data.senha;
      try{
        setLoading(button,true,editing?'Salvando…':'Criando…');
        const result=await api(editing?`/usuarios/${user.id}`:'/usuarios',{method:editing?'PATCH':'POST',body:JSON.stringify(data)});
        if(editing) cache.usuarios=(cache.usuarios||[]).map(item=>Number(item.id)===Number(result.id)?result:item);
        else cache.usuarios=[...(cache.usuarios||[]),result];
        elements.dialog.close();
        renderSettingsPage("users");
        showToast(result?.avisoEmail || (editing?'Usuário atualizado.':'Usuário criado com sucesso.'));
      }catch(err){
        showDialogAlert(err.message || "Não foi possível salvar o usuário.");
      }finally{ setLoading(button,false); }
    });
  }).catch(err=>{
    showDialogAlert(err.message || "Não foi possível carregar os perfis de acesso.");
  });
}
async function openEditUserDialog(id){
  const numericId=Number(id);
  if(!Number.isInteger(numericId)||numericId<=0)return showToast("ID de usuário inválido.");
  const user=(cache.usuarios||[]).find(u=>Number(u.id)===numericId);
  if(user)openNewUserDialog(user); else showToast("Usuário não encontrado na lista atual.");
}
async function toggleUser(id){
 const numericId=Number(id);
 if(!Number.isInteger(numericId)||numericId<=0)return showToast("ID de usuário inválido.");
 const user=(cache.usuarios||[]).find(u=>Number(u.id)===numericId);if(!user)return showToast("Usuário não encontrado na lista atual.");try{if(user.ativo){await api(`/usuarios/${numericId}`,{method:'DELETE'});}else{await api(`/usuarios/${numericId}`,{method:'PATCH',body:JSON.stringify({ativo:true})});}await refreshData();renderUsersPanel();showToast(user.ativo?'Usuário desativado.':'Usuário ativado.');}catch(err){showToast(err.message);}}
async function renderProfilesPanel(){
 if(!can('perfis.editar')){$('#settingsPanel').innerHTML='<div class="settings-empty compact"><span class="eyebrow">PERFIS E PERMISSÕES</span><h3>Acesso somente para visualização</h3><p>Seu perfil não pode alterar permissões.</p></div>';return;}
 try{const [profiles,permissions]=await Promise.all([api('/usuarios/meta/perfis'),api('/usuarios/meta/permissoes')]);
 const groups={};permissions.forEach(x=>(groups[x.modulo]??=[]).push(x));
 $('#settingsPanel').innerHTML=`<div class="permissions-intro"><div><span class="eyebrow">CONTROLE DE ACESSO</span><h3>Perfis e permissões</h3><p>Escolha um perfil para configurar exatamente o que ele pode visualizar ou executar.</p></div><div class="permission-legend"><span><i class="dot active"></i>Permitido</span><span><i class="dot"></i>Não permitido</span></div></div><div class="profiles-grid">${profiles.map(p=>`<article class="profile-card"><div class="profile-head"><div class="profile-identity"><span class="profile-avatar">${(p.nome||'P').slice(0,1).toUpperCase()}</span><div><strong>${escapeHtml(p.nome)}</strong><small>${escapeHtml(p.descricao||'Perfil de acesso')}</small></div></div><div class="profile-head-actions"><span class="permission-count" data-count-profile="${p.id}">${p.permissoes?.length||0} permissões</span><button class="primary-button small-button" data-save-profile="${p.id}">Salvar</button></div></div><div class="permission-groups">${Object.entries(groups).map(([module,items])=>`<section class="permission-group"><div class="permission-group-head"><strong>${escapeHtml(module)}</strong><button type="button" class="text-button" data-select-module="${p.id}" data-module="${escapeHtml(module)}">Selecionar tudo</button></div>${items.map(x=>`<label class="permission-item"><input type="checkbox" data-profile="${p.id}" data-module-input="${escapeHtml(module)}" value="${x.id}" ${p.permissoes?.some(q=>Number(q.id)===Number(x.id))?'checked':''}><span><strong>${escapeHtml(x.acao)}</strong><small>${escapeHtml(x.descricao||x.chave)}</small></span><b class="permission-check">✓</b></label>`).join('')}</section>`).join('')}</div></article>`).join('')}</div>`;
 document.querySelectorAll('[data-profile]').forEach(input=>input.addEventListener('change',()=>updatePermissionCount(input.dataset.profile)));
 document.querySelectorAll('[data-select-module]').forEach(b=>b.addEventListener('click',()=>{const inputs=[...document.querySelectorAll(`[data-profile="${b.dataset.selectModule}"][data-module-input="${b.dataset.module}"]`)];const all=inputs.every(x=>x.checked);inputs.forEach(x=>x.checked=!all);b.textContent=all?'Selecionar tudo':'Desmarcar tudo';updatePermissionCount(b.dataset.selectModule);}));
 document.querySelectorAll('[data-save-profile]').forEach(b=>b.addEventListener('click',async()=>{const ids=[...document.querySelectorAll(`[data-profile="${b.dataset.saveProfile}"]:checked`)].map(x=>Number(x.value));try{b.disabled=true;await api(`/usuarios/meta/perfis/${b.dataset.saveProfile}/permissoes`,{method:'PUT',body:JSON.stringify({permissaoIds:ids})});b.textContent='Salvo ✓';showToast('Permissões salvas com sucesso.');setTimeout(()=>{b.textContent='Salvar';b.disabled=false;},1200);}catch(e){b.disabled=false;showToast(e.message);}}));
 }catch(e){showToast(e.message);}
}
function updatePermissionCount(profileId){const count=document.querySelectorAll(`[data-profile="${profileId}"]:checked`).length;const el=document.querySelector(`[data-count-profile="${profileId}"]`);if(el)el.textContent=`${count} permissões`;}

function renderReportsPage() {
  const total = cache.tarefas.length;
  const done = cache.tarefas.filter((t) => ["entregue", "aprovada"].includes(t.status)).length;
  const overdue = cache.tarefas.filter((t) => t.status === "atrasada").length;
  const ready = cache.equipes.filter((e) => ["pronta_inovamf", "encaminhada_inovamf"].includes(e.status)).length;
  const rate = total ? Math.round((done / total) * 100) : 0;
  elements.workspaceView.innerHTML = `<div class="workspace-heading"><div><span class="eyebrow">ANÁLISE</span><h2>Relatórios</h2><p>Indicadores calculados a partir dos registros atuais do PostgreSQL.</p></div><button class="secondary-button" id="refreshReports">↻ Atualizar</button></div><div class="report-grid"><article><strong>${cache.equipes.length}</strong><span>Equipes</span></article><article><strong>${total}</strong><span>Tarefas</span></article><article><strong>${rate}%</strong><span>Tarefas concluídas</span></article><article><strong>${overdue}</strong><span>Tarefas atrasadas</span></article><article><strong>${ready}</strong><span>Prontas para InovAMF</span></article></div><div class="report-panel"><h3>Distribuição por etapa</h3>${stages.map((stage) => { const count = cache.equipes.filter((e) => Number(e.etapaAtual) === stage.number).length; const pct = cache.equipes.length ? Math.round(count / cache.equipes.length * 100) : 0; return `<div class="report-bar"><span>${stage.shortName}</span><div><i style="width:${pct}%"></i></div><strong>${count}</strong></div>`; }).join("")}</div>`;
  $("#refreshReports").addEventListener("click", async () => { try { await refreshData(); renderReportsPage(); renderDashboard(); showToast("Relatório atualizado."); } catch (error) { showToast(error.message); } });
}

function openNewTeamDialog() {
  closeActiveDialog();
  if(!can("equipes.criar")) return showToast("Seu perfil não pode criar equipes.");
  const leaders = cache.usuarios.filter((u) => u.ativo !== false);
  const mentors = cache.usuarios.filter((u) => u.tipo === "mentor");
  elements.dialogContent.innerHTML = `<header class="dialog-header"><div><span class="eyebrow">NOVO CADASTRO</span><h2>Nova equipe</h2><p>O registro será criado no PostgreSQL.</p></div><button class="close-button" id="closeDialog" type="button">×</button></header><form class="form-body" id="newTeamForm"><label>Nome do projeto<input name="nomeProjeto" required maxlength="150" placeholder="Ex.: Plataforma Educa" /></label><label>Descrição<textarea name="descricaoInicial" required rows="4" placeholder="Descreva a ideia da equipe"></textarea></label><div class="form-grid"><label>Área/setor<input name="areaSetor" required placeholder="Ex.: EdTech" /></label><label>Estágio<select name="estagioAtual"><option value="ideia">Ideia</option><option value="prototipo">Protótipo</option><option value="mvp_desenvolvimento">MVP em desenvolvimento</option><option value="mvp_pronto">MVP pronto</option></select></label></div><div class="form-grid"><label>Líder<select name="liderId" required>${leaders.map((u) => `<option value="${u.id}">${escapeHtml(u.nome)} — ${escapeHtml(u.tipo)}</option>`).join("")}</select></label><label>Mentor<select name="mentorId"><option value="">Sem mentor</option>${mentors.map((u) => `<option value="${u.id}">${escapeHtml(u.nome)}</option>`).join("")}</select></label></div><label>Origem da divulgação<input name="origemDivulgacao" placeholder="Ex.: Instagram, evento, indicação" /></label><footer class="dialog-footer"><span>Ao salvar, a equipe aparece no Kanban imediatamente.</span><div class="dialog-actions"><button class="secondary-button" id="cancelDialog" type="button">Cancelar</button><button class="primary-button" type="submit">Salvar equipe</button></div></footer></form>`;
  elements.dialog.showModal();
  $("#closeDialog").addEventListener("click", () => elements.dialog.close());
  $("#cancelDialog")?.addEventListener("click", () => elements.dialog.close());
  $("#newTeamForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type=submit]");
    setLoading(button, true, "Salvando…");
    try {
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      payload.liderId = Number(payload.liderId);
      if (payload.mentorId) payload.mentorId = Number(payload.mentorId); else delete payload.mentorId;
      await api("/equipes", { method: "POST", body: JSON.stringify(payload) });
      await refreshData(); populateFilters(); elements.dialog.close(); renderDashboard(); renderKanban(); renderDeadlines(); if (currentSection === "teams") renderTeamsPage(); showToast("Equipe criada com sucesso no PostgreSQL.");
    } catch (error) { showToast(error.message); } finally { setLoading(button, false); }
  });
}

function openNewTaskDialog() {
  closeActiveDialog();
  if(!can("tarefas.criar")) return showToast("Seu perfil não pode criar tarefas.");
  if (!cache.equipes.length || !currentUser) return showToast("Cadastre uma equipe antes de criar uma tarefa.");
  elements.dialogContent.innerHTML = `<header class="dialog-header"><div><span class="eyebrow">NOVA TAREFA</span><h2>Criar tarefa</h2><p>A tarefa será vinculada a uma equipe e salva no banco.</p></div><button class="close-button" id="closeDialog" type="button">×</button></header><form class="form-body" id="newTaskForm"><div class="form-grid"><label>Equipe<select name="equipeId" required>${cache.equipes.map((e) => `<option value="${e.id}">${escapeHtml(e.nomeProjeto)}</option>`).join("")}</select></label><label>Etapa<select name="etapaRelacionada">${stages.map((s) => `<option value="${s.number}">${s.number} — ${escapeHtml(s.shortName)}</option>`).join("")}</select></label></div><label>Título<input name="titulo" required maxlength="150" /></label><label>Descrição<textarea name="descricao" rows="3"></textarea></label><div class="form-grid"><label>Data de entrega<input name="dataEntrega" type="date" required /></label><label>Status<select name="status">${Object.entries(statusLabels).map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}</select></label></div><footer class="dialog-footer"><span>Responsável pelo cadastro: ${escapeHtml(currentUser.name || "Administrador")}</span><div class="dialog-actions"><button class="secondary-button" id="cancelDialog" type="button">Cancelar</button><button class="primary-button" type="submit">Salvar tarefa</button></div></footer></form>`;
  elements.dialog.showModal();
  $("#closeDialog").addEventListener("click", () => elements.dialog.close());
  $("#cancelDialog")?.addEventListener("click", () => elements.dialog.close());
  $("#newTaskForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget; const button = form.querySelector("button[type=submit]"); setLoading(button, true, "Salvando…");
    try { const data = Object.fromEntries(new FormData(form).entries()); data.equipeId = Number(data.equipeId); data.etapaRelacionada = Number(data.etapaRelacionada); data.criadoPor = Number(currentUser.id); await api("/tarefas", { method: "POST", body: JSON.stringify(data) }); await refreshData(); elements.dialog.close(); renderDashboard(); renderKanban(); renderDeadlines(); if (currentSection === "tasks") renderTasksPage(); showToast("Tarefa criada com sucesso no PostgreSQL."); } catch (error) { showToast(error.message); } finally { setLoading(button, false); }
  });
}


function prefillLoginEmailFromLink() {
  try {
    const email = new URLSearchParams(window.location.search).get("email");
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const input = $("#email");
      if (input) input.value = email;
    }
  } catch (_) {}
}
prefillLoginEmailFromLink();
const resetToken = new URLSearchParams(location.search).get("reset");
if (resetToken) setTimeout(() => openResetPasswordDialog(resetToken), 0);

function setupLoginExtras() {
  const password = $("#password");
  const toggle = $("#passwordToggle");
  const forgotButton = $("#forgotPasswordButton");
  const forgotDialog = $("#forgotPasswordDialog");
  const closeForgot = $("#closeForgotPassword");
  const cancelForgot = $("#cancelForgotPassword");
  const confirmForgot = $("#confirmForgotPassword");
  const emailPreview = $("#forgotEmailPreview");
  if (toggle && password) toggle.addEventListener("click", () => {
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    toggle.classList.toggle("is-visible", !visible);
    toggle.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
    toggle.setAttribute("aria-pressed", String(!visible));
  });
  const close = () => forgotDialog?.close();
  forgotButton?.addEventListener("click", () => {
    if (!forgotDialog) return;
    if (emailPreview) emailPreview.textContent = $("#email")?.value.trim() || "Nenhum e-mail informado";
    // O modal fica fechado por padrão e só é aberto por este clique.
    if (!forgotDialog.open) forgotDialog.showModal();
  });
  closeForgot?.addEventListener("click", close);
  cancelForgot?.addEventListener("click", close);
  forgotDialog?.addEventListener("click", (event) => { if (event.target === forgotDialog) close(); });
  confirmForgot?.addEventListener("click", () => {
    const email = $("#email")?.value.trim();
    if (!email) { close(); showToast("Informe seu e-mail para solicitar a redefinição."); $("#email")?.focus(); return; }
    close();
    showToast("Solicitação de alteração de senha enviada ao administrador.");
  });
}
setupLoginExtras();

function applyTheme(theme) {
  const light = theme === "light";
  document.documentElement.dataset.theme = theme;
  document.body.classList.toggle("theme-light", light);
  document.body.classList.toggle("theme-dark", !light);
  const app = $("#appShell");
  app?.classList.toggle("theme-light", light);
  app?.classList.toggle("theme-dark", !light);
  const login = $("#loginScreen");
  login?.classList.toggle("theme-light", light);
  const appBtn = $("#appThemeToggle");
  if (appBtn) {
    appBtn.setAttribute("aria-pressed", String(light));
    appBtn.setAttribute("aria-label", light ? "Alternar para tema escuro" : "Alternar para tema claro");
  }
}

function setupAppThemeToggle() {
  const btn = $("#appThemeToggle");
  if (!btn) return;
  const saved = localStorage.getItem("infohub-theme") || "dark";
  applyTheme(saved);
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem("infohub-theme", next);
    applyTheme(next);
  });
}

function setupThemeToggle() {
  const screen = $("#loginScreen");
  const btn = $("#themeToggle");
  if (!screen || !btn) return;
  const saved = localStorage.getItem("infohub-theme");
  const isLight = saved === "light";
  applyTheme(isLight ? "light" : "dark");
  screen.classList.toggle("theme-light", isLight);
  btn.setAttribute("aria-pressed", String(isLight));
  btn.setAttribute("aria-label", isLight ? "Alternar para tema escuro" : "Alternar para tema claro");
  btn.addEventListener("click", () => {
    const nowLight = screen.classList.toggle("theme-light");
    btn.setAttribute("aria-pressed", String(nowLight));
    btn.setAttribute("aria-label", nowLight ? "Alternar para tema escuro" : "Alternar para tema claro");
    localStorage.setItem("infohub-theme", nowLight ? "light" : "dark");
    applyTheme(nowLight ? "light" : "dark");
  });
}
setupThemeToggle();
setupAppThemeToggle();

function openPasswordChangeDialog({ mandatory = false } = {}) {
  closeActiveDialog();
  elements.dialogContent.innerHTML = `<header class="dialog-header"><div><span class="eyebrow">${mandatory ? "PRIMEIRO ACESSO" : "SEGURANÇA"}</span><h2>${mandatory ? "Crie sua nova senha" : "Alterar senha"}</h2><p>${mandatory ? "Por segurança, sua senha temporária não pode ser usada para continuar." : "Digite sua senha atual e escolha uma nova senha."}</p></div><button class="close-button" id="closeDialog" type="button" ${mandatory ? "disabled" : ""}>×</button></header><form class="form-body" id="passwordChangeForm"><label>Senha atual<input name="senhaAtual" type="password" autocomplete="current-password" required ${mandatory ? "value=\"\"" : ""}></label><label>Nova senha<input name="novaSenha" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo de 8 caracteres"></label><label>Confirmar nova senha<input name="confirmacao" type="password" autocomplete="new-password" minlength="8" required placeholder="Repita a nova senha"></label><footer class="dialog-footer"><span>Use pelo menos 8 caracteres e evite reutilizar sua senha anterior.</span><div class="dialog-actions">${mandatory ? "" : '<button class="secondary-button" id="cancelDialog" type="button">Cancelar</button>'}<button class="primary-button" type="submit">Salvar nova senha</button></div></footer></form>`;
  elements.dialog.showModal();
  if (!mandatory) { $("#closeDialog")?.addEventListener("click", () => elements.dialog.close()); $("#cancelDialog")?.addEventListener("click", () => elements.dialog.close()); }
  $("#passwordChangeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form=event.currentTarget, button=form.querySelector("button[type=submit]"), data=Object.fromEntries(new FormData(form).entries());
    if(data.novaSenha!==data.confirmacao){showToast("A confirmação da nova senha não confere.");return;}
    try{
      setLoading(button,true,"Salvando…");
      const result=await api("/auth/change-password",{method:"POST",body:JSON.stringify({senhaAtual:data.senhaAtual,novaSenha:data.novaSenha})});
      currentUser.mustChangePassword=Boolean(result.mustChangePassword);
      elements.dialog.close();
      showToast("Senha alterada com sucesso.");
      if(mandatory) await finishLogin();
    }catch(error){showToast(error.message);}finally{setLoading(button,false);}
  });
}

async function finishLogin(){
  await refreshData(); populateFilters();
  elements.loginScreen.classList.add("is-hidden"); elements.appShell.classList.remove("is-hidden");
  $("#userName") && ($("#userName").textContent = currentUser.name); $("#userRole") && ($("#userRole").textContent = currentUser.role === "admin" ? "Administrador" : roleLabel(currentUser.role));
  if ($("#userAvatar")) $("#userAvatar").innerHTML = avatarMarkup(currentUser.name, currentUser.id, "user-avatar");
  const roleLabelTop = roleLabel(currentUser.role);
  ["#topAvatar", "#topAvatarBig"].forEach(selector => { const el = $(selector); if (el) el.outerHTML = avatarMarkup(currentUser.name, currentUser.id, "mini-avatar"); });
  if ($("#topUserName")) $("#topUserName").textContent = currentUser.name;
  if ($("#topUserRole")) $("#topUserRole").textContent = roleLabelTop;
  if ($("#menuUserName")) $("#menuUserName").textContent = currentUser.name;
  if ($("#menuUserRole")) $("#menuUserRole").textContent = roleLabelTop;
  renderDashboard(); renderKanban(); renderDeadlines();
  document.querySelectorAll(".admin-only").forEach(el=>el.classList.toggle("visible", can("usuarios.visualizar"))); applyNavigationPermissions();
  $("#newTeamButton").classList.toggle("is-hidden", !can("equipes.criar"));
  showSection("dashboard");
}

function openResetPasswordDialog(token){
  closeActiveDialog();
  elements.dialogContent.innerHTML=`<header class="dialog-header"><div><span class="eyebrow">RECUPERAÇÃO DE ACESSO</span><h2>Defina uma nova senha</h2><p>Escolha uma nova senha para voltar a acessar o InfoHub.</p></div></header><form class="form-body" id="resetPasswordForm"><label>Nova senha<input name="novaSenha" type="password" autocomplete="new-password" minlength="8" required placeholder="Mínimo de 8 caracteres"></label><label>Confirmar nova senha<input name="confirmacao" type="password" autocomplete="new-password" minlength="8" required></label><footer class="dialog-footer"><span>O link de recuperação é de uso único e expira em 1 hora.</span><div class="dialog-actions"><button class="primary-button" type="submit">Redefinir senha</button></div></footer></form>`;
  elements.dialog.showModal();
  $("#resetPasswordForm").addEventListener("submit",async event=>{
    event.preventDefault(); const form=event.currentTarget, button=form.querySelector("button[type=submit]"), data=Object.fromEntries(new FormData(form).entries());
    if(data.novaSenha!==data.confirmacao){showToast("A confirmação da nova senha não confere.");return;}
    try{setLoading(button,true,"Redefinindo…"); const r=await api("/auth/reset-password",{method:"POST",body:JSON.stringify({token,novaSenha:data.novaSenha})}); elements.dialog.close(); history.replaceState({},"",location.pathname); $("#password").value=""; showToast(r.mensagem||"Senha redefinida com sucesso.");}catch(error){showToast(error.message);}finally{setLoading(button,false);}
  });
}

async function requestPasswordReset(){
  const email=String($("#email")?.value||"").trim().toLowerCase();
  if(!email){showToast("Informe seu e-mail antes de solicitar a recuperação."); $("#email")?.focus(); return;}
  try{setLoading($("#confirmForgotPassword"),true,"Enviando…"); const r=await api("/auth/request-password-reset",{method:"POST",body:JSON.stringify({email})}); $("#forgotPasswordDialog")?.close(); showToast(r.mensagem); }catch(error){showToast(error.message);}finally{setLoading($("#confirmForgotPassword"),false);}
}

async function enterApp(event) {
  event.preventDefault();
  const button = elements.loginForm.querySelector("button[type='submit']");
  setLoading(button, true, "Entrando…");
  try {
    const result = await api("/auth/login", { method: "POST", body: JSON.stringify({ email: $("#email").value.trim(), senha: $("#password").value }) });
    currentUser = result.user;
    accessToken = result.accessToken;
    sessionStorage.setItem(SESSION_STORAGE_KEY, accessToken);
    if (currentUser.mustChangePassword) {
      openPasswordChangeDialog({ mandatory: true });
      return;
    }
    await finishLogin();
  } catch (error) { showToast(error.message); } finally { setLoading(button, false); }
}

elements.loginForm.addEventListener("submit", enterApp);
elements.searchInput.addEventListener("input", renderKanban);
elements.areaFilter.addEventListener("change", renderKanban);
elements.mentorFilter.addEventListener("change", renderKanban);
elements.clearFilters.addEventListener("click", () => { elements.searchInput.value = ""; elements.areaFilter.value = ""; elements.mentorFilter.value = ""; renderKanban(); showToast("Filtros limpos."); });
elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) elements.dialog.close(); });
$("#menuButton").addEventListener("click", () => elements.sidebar.classList.toggle("open"));
function doLogout() { currentUser = null; accessToken = null; sessionStorage.removeItem(SESSION_STORAGE_KEY); elements.appShell.classList.add("is-hidden"); elements.loginScreen.classList.remove("is-hidden"); elements.loginForm.reset(); $("#email").value = ""; $("#password").value = ""; }
$("#logoutButton")?.addEventListener("click", doLogout);

function setupUserMenu() {
  const menu = $("#userMenu");
  const trigger = $("#userMenuTrigger");
  const dropdown = $("#userMenuDropdown");
  if (!menu || !trigger || !dropdown) return;
  const closeMenu = () => { menu.classList.remove("is-open"); dropdown.classList.add("is-hidden"); trigger.setAttribute("aria-expanded", "false"); };
  const openMenu = () => { menu.classList.add("is-open"); dropdown.classList.remove("is-hidden"); trigger.setAttribute("aria-expanded", "true"); };
  trigger.addEventListener("click", (event) => { event.stopPropagation(); dropdown.classList.contains("is-hidden") ? openMenu() : closeMenu(); });
  document.addEventListener("click", (event) => { if (!menu.contains(event.target)) closeMenu(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
  $("#menuSettingsButton")?.addEventListener("click", () => { closeMenu(); if (!can("configuracoes.visualizar")) { showToast("Seu perfil não possui acesso a esta área."); return; } showSection("settings"); });
  $("#menuProfileButton")?.addEventListener("click", () => { closeMenu(); openPasswordChangeDialog(); });
  $("#menuLogoutButton")?.addEventListener("click", () => { closeMenu(); doLogout(); });
}
setupUserMenu();
$("#sidebarTipButton")?.addEventListener("click", () => showToast("Dica: use o menu do seu perfil no canto superior direito para acessar sua conta e configurações."));

$("#newTeamButton").addEventListener("click", openNewTeamDialog);
$("#listViewButton").addEventListener("click", () => { currentView = "list"; $("#listViewButton").classList.add("active"); $("#kanbanViewButton").classList.remove("active"); renderKanban(); });
$("#kanbanViewButton").addEventListener("click", () => { currentView = "kanban"; $("#kanbanViewButton").classList.add("active"); $("#listViewButton").classList.remove("active"); renderKanban(); });
$("#allTasksButton").addEventListener("click", () => showSection("tasks"));
document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => { const needed={teams:"equipes.visualizar",tasks:"tarefas.visualizar",reports:"relatorios.visualizar",settings:"configuracoes.visualizar",users:"usuarios.visualizar",profiles:"usuarios.visualizar"}[button.dataset.section]; if(needed&&!can(needed)){showToast("Seu perfil não possui acesso a esta área.");return;} showSection(button.dataset.section); }));

const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
$("#todayLabel").textContent = today.charAt(0).toUpperCase() + today.slice(1);
