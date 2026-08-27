import { mockApi } from "./mock-api.js";

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
};

const statusLabels = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  SUBMITTED: "Entregue",
  OVERDUE: "Atrasada",
  APPROVED: "Aprovada",
  CHANGES_REQUESTED: "Ajustes solicitados",
};

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

function setLoading(button, loading) {
  button.disabled = loading;
  button.dataset.originalText ||= button.innerHTML;
  button.innerHTML = loading ? "Carregando…" : button.dataset.originalText;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function initials(name) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("");
}

async function renderDashboard() {
  const dashboard = await mockApi.getDashboard();
  const cards = [
    ["Equipes ativas", dashboard.activeTeams, "no ciclo atual", "accent-teal"],
    ["Tarefas atrasadas", dashboard.overdueTasks, "pedem atenção", "accent-coral"],
    ["Prontas para o InovAMF", dashboard.readyForInovamf, "com materiais aprovados", "accent-violet"],
    ["Mentores ativos", dashboard.mentors, "acompanhando equipes", "accent-gold"],
  ];
  elements.statsGrid.innerHTML = cards.map(([label, value, note, tone], index) => `
    <article class="stat-card ${tone}">
      <div class="stat-number">${String(value).padStart(2, "0")}</div>
      <div><h3>${label}</h3><p>${note}</p></div>
      <span class="stat-index">0${index + 1}</span>
    </article>
  `).join("");
  $("#teamNavCount").textContent = dashboard.activeTeams;
  $("#taskNavCount").textContent = dashboard.pendingTasks;
}

function teamCard(item) {
  const pending = item.tasks.filter((task) => task.status !== "APPROVED").length;
  const hasOverdue = item.tasks.some((task) => task.status === "OVERDUE");
  return `
    <button class="team-card" type="button" data-team-id="${item.id}" aria-label="Abrir equipe ${item.name}">
      <div class="team-card-top">
        <span class="area-tag">${item.project.area.name}</span>
        <span class="more" aria-hidden="true">•••</span>
      </div>
      <h3>${item.name}</h3>
      <p>${item.project.name}</p>
      <div class="card-divider"></div>
      <div class="mentor-row">
        <span class="mini-avatar">${initials(item.mentor.name)}</span>
        <span>${item.mentor.name}</span>
      </div>
      <div class="card-meta">
        <span>${item.members.length} integrantes</span>
        <span class="${hasOverdue ? "danger" : ""}">${pending} ${pending === 1 ? "pendência" : "pendências"}</span>
      </div>
    </button>
  `;
}

async function renderKanban() {
  elements.kanban.innerHTML = '<div class="loading-state">Atualizando jornada…</div>';
  const columns = await mockApi.getKanban({
    search: elements.searchInput.value,
    area: elements.areaFilter.value,
    mentor: elements.mentorFilter.value,
  });

  elements.kanban.innerHTML = columns.map(({ stage, teams }) => `
    <section class="kanban-column" aria-labelledby="stage-${stage.number}">
      <header>
        <div class="stage-number">${String(stage.number).padStart(2, "0")}</div>
        <div><h3 id="stage-${stage.number}">${stage.shortName}</h3><p>${stage.name}</p></div>
        <span class="team-count">${teams.length}</span>
      </header>
      <div class="column-body">
        ${teams.length ? teams.map(teamCard).join("") : '<div class="empty-column">Nenhuma equipe</div>'}
      </div>
    </section>
  `).join("");

  document.querySelectorAll("[data-team-id]").forEach((button) => {
    button.addEventListener("click", () => openTeam(button.dataset.teamId));
  });
}

async function renderDeadlines() {
  const tasks = await mockApi.getUpcomingTasks();
  elements.deadlineList.innerHTML = tasks.map((task) => `
    <button class="deadline-item" type="button" data-deadline-team="${task.team.id}">
      <span class="deadline-date"><strong>${formatDate(task.dueDate).split(" ")[0]}</strong>${formatDate(task.dueDate).split(" ")[1]}</span>
      <span class="deadline-main"><strong>${task.title}</strong><small>${task.team.name}</small></span>
      <span class="status-pill status-${task.status.toLowerCase()}">${statusLabels[task.status]}</span>
      <span aria-hidden="true">→</span>
    </button>
  `).join("");
  document.querySelectorAll("[data-deadline-team]").forEach((button) => {
    button.addEventListener("click", () => openTeam(button.dataset.deadlineTeam));
  });
}

async function openTeam(id) {
  const item = await mockApi.getTeam(id);
  const progress = Math.round((item.currentStage.number / 6) * 100);
  elements.dialogContent.innerHTML = `
    <header class="dialog-header">
      <div>
        <span class="eyebrow">DETALHE DA EQUIPE</span>
        <h2>${item.name}</h2>
        <p>${item.project.name} · ${item.project.area.name}</p>
      </div>
      <button class="close-button" id="closeDialog" type="button" aria-label="Fechar">×</button>
    </header>
    <div class="dialog-body">
      <section class="journey-progress">
        <div><span>Etapa ${item.currentStage.number} de 6</span><strong>${item.currentStage.name}</strong></div>
        <div class="progress-track"><i style="width: ${progress}%"></i></div>
      </section>
      <div class="detail-grid">
        <section>
          <h3>Projeto</h3>
          <p>${item.project.description}</p>
          <dl><div><dt>Estágio</dt><dd>${item.project.developmentStage.replaceAll("_", " ")}</dd></div><div><dt>Mentor</dt><dd>${item.mentor.name}</dd></div></dl>
        </section>
        <section>
          <h3>Integrantes</h3>
          <div class="member-list">${item.members.map((member) => `
            <div><span class="mini-avatar">${initials(member.name)}</span><span><strong>${member.name}</strong><small>${member.course}${member.roleInTeam === "LEADER" ? " · Líder" : ""}</small></span></div>
          `).join("")}</div>
        </section>
      </div>
      <section class="task-detail">
        <h3>Tarefas da etapa</h3>
        ${item.tasks.map((task) => `<div><span><strong>${task.title}</strong><small>Prazo: ${formatDate(task.dueDate)}</small></span><span class="status-pill status-${task.status.toLowerCase()}">${statusLabels[task.status]}</span></div>`).join("") || '<p>Nenhuma tarefa atribuída.</p>'}
      </section>
    </div>
    <footer class="dialog-footer">
      <span>Alterações são apenas locais neste protótipo.</span>
      <button class="primary-button" id="advanceButton" type="button" ${item.currentStage.number >= 6 ? "disabled" : ""}>Avançar para próxima etapa →</button>
    </footer>
  `;
  elements.dialog.showModal();
  $("#closeDialog").addEventListener("click", () => elements.dialog.close());
  const advanceButton = $("#advanceButton");
  advanceButton?.addEventListener("click", async () => {
    setLoading(advanceButton, true);
    await mockApi.advanceTeam(item.id);
    elements.dialog.close();
    await renderKanban();
    showToast(`${item.name} avançou uma etapa no modo demonstração.`);
  });
}

function populateFilters() {
  const filters = mockApi.getFilters();
  elements.areaFilter.insertAdjacentHTML("beforeend", filters.areas.map((area) => `<option>${area}</option>`).join(""));
  elements.mentorFilter.insertAdjacentHTML("beforeend", filters.mentors.map((mentor) => `<option>${mentor}</option>`).join(""));
}

async function enterApp(event) {
  event.preventDefault();
  const button = elements.loginForm.querySelector("button[type='submit']");
  setLoading(button, true);
  try {
    await mockApi.login({ email: $("#email").value, password: $("#password").value });
    elements.loginScreen.classList.add("is-hidden");
    elements.appShell.classList.remove("is-hidden");
    await Promise.all([renderDashboard(), renderKanban(), renderDeadlines()]);
  } catch (error) {
    showToast(error.message);
  } finally {
    setLoading(button, false);
  }
}

elements.loginForm.addEventListener("submit", enterApp);
elements.searchInput.addEventListener("input", renderKanban);
elements.areaFilter.addEventListener("change", renderKanban);
elements.mentorFilter.addEventListener("change", renderKanban);
elements.clearFilters.addEventListener("click", () => {
  elements.searchInput.value = "";
  elements.areaFilter.value = "";
  elements.mentorFilter.value = "";
  renderKanban();
});
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
$("#menuButton").addEventListener("click", () => elements.sidebar.classList.toggle("open"));
$("#logoutButton").addEventListener("click", () => window.location.reload());
$("#forgotButton").addEventListener("click", () => showToast("Recuperação de senha será conectada à futura API."));
$("#newTeamButton").addEventListener("click", () => showToast("Cadastro de equipe demonstrativo — formulário previsto no contrato da API."));
$("#listViewButton").addEventListener("click", () => showToast("A visualização em lista ficará para a próxima versão."));
$("#allTasksButton").addEventListener("click", () => showToast("Lista completa de tarefas prevista para a próxima versão."));
document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  if (button.dataset.section !== "dashboard") showToast("Este protótipo concentra a apresentação na visão geral.");
  elements.sidebar.classList.remove("open");
}));

const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
$("#todayLabel").textContent = today.charAt(0).toUpperCase() + today.slice(1);
populateFilters();
