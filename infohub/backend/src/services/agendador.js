// =====================================================================
// Rotina automatica do InfoHub.
// - Marca como "atrasada" toda tarefa vencida sem entrega (RN-04)
// - Dispara os lembretes agendados que ja venceram (RF-17 / RF-18)
// Executa a cada INTERVALO_MIN minutos dentro do proprio processo Node,
// sem depender de cron externo.
// =====================================================================
const { Op } = require("sequelize");
const { Tarefa, Equipe, Lembrete } = require("../models");
const notificacoes = require("./notificacoes");

const INTERVALO_MIN = Number(process.env.AGENDADOR_INTERVALO_MIN || 30);

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

// RN-04 - tarefas vencidas sem entrega viram "atrasada" e geram aviso.
async function marcarAtrasadas() {
  const vencidas = await Tarefa.findAll({
    where: {
      dataEntrega: { [Op.lt]: hojeISO() },
      status: { [Op.in]: ["pendente", "em_andamento"] },
    },
    include: [{ model: Equipe, as: "equipe" }],
  });

  for (const tarefa of vencidas) {
    await tarefa.update({ status: "atrasada" });
    try {
      await notificacoes.prazoVencido(tarefa, tarefa.equipe);
    } catch (erro) {
      console.error("[AGENDADOR] Falha ao avisar atraso:", erro.message);
    }
  }
  return vencidas.length;
}

// RF-17 / RF-18 - envia os lembretes configurados cuja data ja chegou.
async function dispararLembretes() {
  const pendentes = await Lembrete.findAll({
    where: { enviadoEm: null, dataEnvio: { [Op.lte]: new Date() } },
    include: [{ model: Tarefa, as: "tarefa", include: [{ model: Equipe, as: "equipe" }] }],
    limit: 200,
  });

  let enviados = 0;
  for (const lembrete of pendentes) {
    const tarefa = lembrete.tarefa;
    // Tarefa ja concluida nao precisa de lembrete: apenas encerra o registro.
    if (!tarefa || ["entregue", "aprovada"].includes(tarefa.status)) {
      await lembrete.update({ enviadoEm: new Date() });
      continue;
    }
    try {
      await notificacoes.lembretePrazo(tarefa, tarefa.equipe, lembrete.diasAntes ?? 0);
      await lembrete.update({ enviadoEm: new Date() });
      enviados += 1;
    } catch (erro) {
      console.error("[AGENDADOR] Falha ao enviar lembrete:", erro.message);
    }
  }
  return enviados;
}

async function executarCiclo() {
  try {
    const atrasadas = await marcarAtrasadas();
    const lembretes = await dispararLembretes();
    if (atrasadas || lembretes) {
      console.log(`[AGENDADOR] ${atrasadas} tarefa(s) marcada(s) como atrasada(s), ${lembretes} lembrete(s) enviado(s).`);
    }
  } catch (erro) {
    console.error("[AGENDADOR] Erro no ciclo:", erro.message);
  }
}

function iniciar() {
  console.log(`[AGENDADOR] Rotina de lembretes ativa (a cada ${INTERVALO_MIN} min).`);
  setTimeout(executarCiclo, 15000).unref?.();
  const timer = setInterval(executarCiclo, INTERVALO_MIN * 60 * 1000);
  timer.unref?.();
  return timer;
}

module.exports = { iniciar, executarCiclo, marcarAtrasadas, dispararLembretes };
