const stages = [
  { id: "stage-1", number: 1, name: "Envio da ideia", shortName: "Ideia" },
  { id: "stage-2", number: 2, name: "Contato com a equipe", shortName: "Contato" },
  { id: "stage-3", number: 3, name: "Encontro 1 – Entendendo a ideia", shortName: "Encontro 1" },
  { id: "stage-4", number: 4, name: "Encontro 2 – Proposta de valor", shortName: "Encontro 2" },
  { id: "stage-5", number: 5, name: "Encontro 3 – Modelo de negócio", shortName: "Encontro 3" },
  { id: "stage-6", number: 6, name: "Encontro 4 – Pitch e inscrição", shortName: "Encontro 4" },
];

let teams = [
  team("team-1", "Aurora", 1, "ACTIVE", "Mente Leve", "Saúde", "Mariana Lopes", 3, ["PENDING"]),
  team("team-2", "Nexo", 1, "ACTIVE", "Conecta Campus", "Tecnologia", "Rafael Nunes", 4, ["IN_PROGRESS"]),
  team("team-3", "Raiz", 2, "ACTIVE", "Horta Circular", "Sustentabilidade", "Mariana Lopes", 3, ["OVERDUE"]),
  team("team-4", "Lumina", 3, "ACTIVE", "Trilha Acessível", "Educação", "Carlos Freitas", 5, ["APPROVED", "PENDING"]),
  team("team-5", "Horizonte", 4, "ACTIVE", "Clínica Perto", "Saúde", "Carlos Freitas", 4, ["SUBMITTED"]),
  team("team-6", "Vértice", 5, "ACTIVE", "EcoTrace", "Sustentabilidade", "Rafael Nunes", 3, ["OVERDUE", "CHANGES_REQUESTED"]),
  team("team-7", "Prisma", 5, "ACTIVE", "TutorIA", "Tecnologia", "Mariana Lopes", 4, ["SUBMITTED"]),
  team("team-8", "Ímpeto", 6, "READY_FOR_INOVAMF", "ReAprende", "Educação", "Carlos Freitas", 5, ["APPROVED", "APPROVED"]),
];

function team(id, name, stageNumber, status, projectName, area, mentorName, memberCount, taskStatuses) {
  const currentStage = stages[stageNumber - 1];
  const taskTitles = ["Enviar Business Model Canvas", "Revisar proposta de valor", "Confirmar encontro com mentor"];
  return {
    id,
    name,
    status,
    currentStage,
    mentor: { id: `mentor-${mentorName}`, name: mentorName },
    project: {
      id: `project-${id}`,
      name: projectName,
      description: `Solução desenvolvida pela equipe ${name} para gerar impacto na área de ${area.toLowerCase()}.`,
      area: { id: `area-${area}`, name: area },
      developmentStage: stageNumber < 3 ? "IDEA" : stageNumber < 5 ? "PROTOTYPE" : "MVP_IN_DEVELOPMENT",
    },
    members: Array.from({ length: memberCount }, (_, index) => ({
      id: `${id}-member-${index + 1}`,
      name: index === 0 ? ["Ana Souza", "Bruno Lima", "Clara Alves", "Diego Moraes"][Number(id.at(-1)) % 4] : `Integrante ${index + 1}`,
      course: index % 2 ? "Administração" : "Engenharia de Software",
      roleInTeam: index === 0 ? "LEADER" : "MEMBER",
    })),
    tasks: taskStatuses.map((taskStatus, index) => ({
      id: `${id}-task-${index + 1}`,
      title: taskTitles[index % taskTitles.length],
      status: taskStatus,
      required: true,
      dueDate: index === 0 ? "2026-08-28T21:00:00-03:00" : "2026-09-02T21:00:00-03:00",
    })),
    updatedAt: "2026-08-26T18:30:00-03:00",
  };
}

const wait = (value, delay = 180) => new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), delay));

export const mockApi = {
  async login({ email, password }) {
    if (!email || !password) throw new Error("Informe e-mail e senha.");
    return wait({
      accessToken: "mock-token-local",
      user: { id: "admin-demo", name: "Alex Martins", email, role: "ADMIN" },
    }, 320);
  },

  async getDashboard() {
    const allTasks = teams.flatMap((item) => item.tasks);
    return wait({
      activeTeams: teams.filter((item) => item.status === "ACTIVE").length,
      overdueTasks: allTasks.filter((item) => item.status === "OVERDUE").length,
      readyForInovamf: teams.filter((item) => ["READY_FOR_INOVAMF", "REFERRED_TO_INOVAMF"].includes(item.status)).length,
      mentors: new Set(teams.map((item) => item.mentor.id)).size,
      pendingTasks: allTasks.filter((item) => item.status !== "APPROVED").length,
    });
  },

  async getKanban(filters = {}) {
    const query = (filters.search || "").trim().toLocaleLowerCase("pt-BR");
    const filtered = teams.filter((item) => {
      const textMatches = !query || `${item.name} ${item.project.name}`.toLocaleLowerCase("pt-BR").includes(query);
      const areaMatches = !filters.area || item.project.area.name === filters.area;
      const mentorMatches = !filters.mentor || item.mentor.name === filters.mentor;
      return textMatches && areaMatches && mentorMatches;
    });

    return wait(stages.map((stage) => ({
      stage,
      teams: filtered.filter((item) => item.currentStage.number === stage.number),
    })));
  },

  async getTeam(id) {
    const found = teams.find((item) => item.id === id);
    if (!found) throw new Error("Equipe não encontrada.");
    return wait(found);
  },

  async advanceTeam(id) {
    const found = teams.find((item) => item.id === id);
    if (!found) throw new Error("Equipe não encontrada.");
    if (found.currentStage.number >= 6) {
      found.status = "READY_FOR_INOVAMF";
      return wait(found);
    }
    found.currentStage = stages[found.currentStage.number];
    found.updatedAt = new Date().toISOString();
    return wait(found, 260);
  },

  async getUpcomingTasks() {
    return wait(
      teams.flatMap((item) => item.tasks.map((task) => ({ ...task, team: { id: item.id, name: item.name } })))
        .filter((task) => task.status !== "APPROVED")
        .slice(0, 4),
    );
  },

  getFilters() {
    return {
      areas: [...new Set(teams.map((item) => item.project.area.name))].sort(),
      mentors: [...new Set(teams.map((item) => item.mentor.name))].sort(),
    };
  },
};
