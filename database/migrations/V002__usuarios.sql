BEGIN;

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    email VARCHAR(320) NOT NULL,
    senha_hash TEXT NOT NULL,
    telefone VARCHAR(30),
    tipo VARCHAR(20) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    consentimento_privacidade_em TIMESTAMPTZ,
    versao_politica_privacidade VARCHAR(50),
    ultimo_login_em TIMESTAMPTZ,
    excluido_em TIMESTAMPTZ,
    anonimizado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT ck_usuarios_nome CHECK (length(btrim(nome)) >= 2),
    CONSTRAINT ck_usuarios_email_normalizado CHECK (
        email = lower(btrim(email)) AND position('@' IN email) > 1
    ),
    CONSTRAINT ck_usuarios_senha_hash CHECK (length(senha_hash) >= 20),
    CONSTRAINT ck_usuarios_tipo CHECK (tipo IN ('ADMIN', 'MENTOR', 'STUDENT')),
    CONSTRAINT ck_usuarios_consentimento CHECK (
        versao_politica_privacidade IS NULL OR consentimento_privacidade_em IS NOT NULL
    ),
    CONSTRAINT ck_usuarios_excluido_inativo CHECK (excluido_em IS NULL OR ativo = FALSE),
    CONSTRAINT ck_usuarios_anonimizado_inativo CHECK (anonimizado_em IS NULL OR ativo = FALSE)
);

COMMENT ON TABLE usuarios IS 'Contas de acesso; senha somente como hash e exclusão lógica para dados pessoais.';

CREATE TRIGGER trg_usuarios_atualizado_em
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION definir_atualizado_em();

CREATE TABLE tokens_recuperacao_senha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    token_hash TEXT NOT NULL,
    expira_em TIMESTAMPTZ NOT NULL,
    usado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tokens_recuperacao_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT uq_tokens_recuperacao_hash UNIQUE (token_hash),
    CONSTRAINT ck_tokens_recuperacao_hash CHECK (length(token_hash) >= 32),
    CONSTRAINT ck_tokens_recuperacao_expiracao CHECK (expira_em > criado_em),
    CONSTRAINT ck_tokens_recuperacao_uso CHECK (usado_em IS NULL OR usado_em >= criado_em)
);

COMMIT;
