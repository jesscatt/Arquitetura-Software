// Formulário público de envio de ideia (Etapa 1 da jornada).
const $ = (seletor) => document.querySelector(seletor);
const aviso = $("#aviso");
const listaColegas = $("#listaColegas");
let maxIntegrantes = 6;

function mostrarAviso(texto, tipo = "erro") {
  aviso.className = `aviso ${tipo}`;
  aviso.textContent = texto;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function linhaColega() {
  const linha = document.createElement("div");
  linha.className = "colega";
  linha.innerHTML = `
    <input name="colegaNome" placeholder="Nome do colega" maxlength="150" />
    <input name="colegaEmail" type="email" placeholder="E-mail (opcional)" maxlength="180" />
    <input name="colegaCurso" placeholder="Curso" maxlength="100" />
    <button class="remover" type="button" aria-label="Remover colega">&times;</button>`;
  linha.querySelector(".remover").addEventListener("click", () => linha.remove());
  return linha;
}

$("#adicionarColega").addEventListener("click", () => {
  if (listaColegas.children.length + 1 >= maxIntegrantes) {
    mostrarAviso(`A equipe pode ter no máximo ${maxIntegrantes} integrantes, incluindo você.`);
    return;
  }
  listaColegas.appendChild(linhaColega());
});

// Carrega áreas e estágios definidos pelo administrador.
(async function carregarMetadados() {
  try {
    const resposta = await fetch("/inscricao/dados");
    const dados = await resposta.json();
    maxIntegrantes = dados.maxIntegrantes || 6;
    $("#campoArea").innerHTML = '<option value="">Selecione…</option>' + dados.areas.map((a) => `<option value="${a}">${a}</option>`).join("");
    $("#campoEstagio").innerHTML = '<option value="">Selecione…</option>' + dados.estagios.map((e) => `<option value="${e.valor}">${e.rotulo}</option>`).join("");
  } catch (_) {
    $("#campoArea").innerHTML = '<option value="">Não foi possível carregar as áreas</option>';
  }
})();

$("#formularioInscricao").addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const botao = formulario.querySelector("button.enviar");
  const dadosFormulario = new FormData(formulario);

  const nomes = dadosFormulario.getAll("colegaNome");
  const emails = dadosFormulario.getAll("colegaEmail");
  const cursos = dadosFormulario.getAll("colegaCurso");

  const carga = {
    nome: dadosFormulario.get("nome"),
    email: dadosFormulario.get("email"),
    telefone: dadosFormulario.get("telefone"),
    curso: dadosFormulario.get("curso"),
    semestre: dadosFormulario.get("semestre"),
    senha: dadosFormulario.get("senha"),
    nomeProjeto: dadosFormulario.get("nomeProjeto"),
    descricaoInicial: dadosFormulario.get("descricaoInicial"),
    areaSetor: dadosFormulario.get("areaSetor"),
    estagioAtual: dadosFormulario.get("estagioAtual"),
    origemDivulgacao: dadosFormulario.get("origemDivulgacao"),
    consentimentoLgpd: formulario.consentimentoLgpd.checked,
    integrantes: nomes
      .map((nome, indice) => ({ nome: String(nome || "").trim(), email: String(emails[indice] || "").trim(), curso: String(cursos[indice] || "").trim() }))
      .filter((colega) => colega.nome),
  };

  if (!formulario.checkValidity()) {
    formulario.reportValidity();
    return;
  }

  try {
    botao.disabled = true;
    botao.textContent = "Enviando…";
    const resposta = await fetch("/inscricao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(carga),
    });
    const resultado = await resposta.json().catch(() => null);
    if (!resposta.ok) throw new Error(resultado?.erro || `Erro ${resposta.status}`);

    formulario.style.display = "none";
    mostrarAviso(`${resultado.mensagem} Acesse o sistema com o e-mail ${resultado.email} e a senha cadastrada.`, "sucesso");
    setTimeout(() => {
      window.location.href = `./index.html?email=${encodeURIComponent(resultado.email)}`;
    }, 5000);
  } catch (erro) {
    mostrarAviso(erro.message);
  } finally {
    botao.disabled = false;
    botao.textContent = "Enviar ideia";
  }
});
