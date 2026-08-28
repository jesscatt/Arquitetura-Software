const { Usuario, Perfil, Permissao, IntegranteEquipe } = require("./models");

async function autenticar(req, res, next) {
  try {
    const raw = req.headers.authorization || "";
    const match = raw.match(/^Bearer\s+demo-(\d+)$/);
    if (!match) return res.status(401).json({ erro: "Autenticação necessária." });

    const usuario = await Usuario.findByPk(match[1], {
      include: [{
        model: Perfil,
        as: "perfil",
        include: [{ model: Permissao, as: "permissoes", through: { attributes: [] } }],
      }],
    });

    if (!usuario || !usuario.ativo) return res.status(401).json({ erro: "Sessão inválida." });
    req.usuario = usuario;
    req.permissoes = new Set((usuario.perfil?.permissoes || []).map((p) => p.chave));

    // Conta recém-criada/resetada só pode acessar a troca obrigatória de senha.
    if (
      usuario.deveAlterarSenha &&
      !(req.baseUrl === "/auth" && req.path === "/change-password")
    ) {
      return res.status(403).json({ erro: "Você precisa alterar sua senha antes de continuar.", codigo: "ALTERACAO_SENHA_OBRIGATORIA" });
    }

    next();
  } catch (err) {
    next(err);
  }
}

function exigirPermissao(chave) {
  return (req, res, next) => {
    if (req.usuario?.tipo === "admin" || req.permissoes.has(chave)) return next();
    return res.status(403).json({ erro: `Sem permissão: ${chave}.` });
  };
}

async function escopoEquipe(equipe, usuario) {
  if (!equipe || !usuario) return false;
  if (usuario.tipo === "admin") return true;
  if (usuario.tipo === "mentor") return Number(equipe.mentorId) === Number(usuario.id);
  if (usuario.tipo === "aluno") return Number(equipe.liderId) === Number(usuario.id);
  if (usuario.tipo === "integrante") {
    const participacao = await IntegranteEquipe.findOne({
      where: { equipeId: equipe.id, usuarioId: usuario.id },
      attributes: ["id"],
    });
    return Boolean(participacao);
  }
  return false;
}

module.exports = { autenticar, exigirPermissao, escopoEquipe };
