BEGIN;

CREATE TABLE log_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID,
    acao VARCHAR(100) NOT NULL,
    tipo_entidade VARCHAR(100) NOT NULL,
    entidade_id UUID,
    valores_anteriores JSONB,
    valores_novos JSONB,
    endereco_ip INET,
    agente_usuario TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT ck_log_auditoria_acao CHECK (length(btrim(acao)) >= 2),
    CONSTRAINT ck_log_auditoria_entidade CHECK (length(btrim(tipo_entidade)) >= 2),
    CONSTRAINT ck_log_auditoria_valores_anteriores CHECK (
        valores_anteriores IS NULL OR jsonb_typeof(valores_anteriores) = 'object'
    ),
    CONSTRAINT ck_log_auditoria_valores_novos CHECK (
        valores_novos IS NULL OR jsonb_typeof(valores_novos) = 'object'
    )
);

COMMENT ON TABLE log_auditoria IS 'Alimentado pela futura API; não registrar dados pessoais desnecessários nos JSONs.';

COMMIT;
