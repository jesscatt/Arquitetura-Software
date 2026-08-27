BEGIN;

CREATE TABLE arquivos_entrega (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entrega_id UUID NOT NULL,
    nome_original VARCHAR(500),
    chave_armazenamento TEXT,
    url_externa TEXT,
    tipo_mime VARCHAR(255),
    tamanho_bytes BIGINT,
    checksum VARCHAR(128),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_arquivos_entrega_entrega
        FOREIGN KEY (entrega_id) REFERENCES entregas(id) ON DELETE RESTRICT,
    CONSTRAINT ck_arquivos_entrega_localizacao CHECK (
        NULLIF(btrim(chave_armazenamento), '') IS NOT NULL
        OR NULLIF(btrim(url_externa), '') IS NOT NULL
    ),
    CONSTRAINT ck_arquivos_entrega_url CHECK (url_externa IS NULL OR url_externa ~* '^https?://'),
    CONSTRAINT ck_arquivos_entrega_tamanho CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0)
);

COMMENT ON TABLE arquivos_entrega IS 'Metadados e localização externa; binários grandes não ficam no PostgreSQL.';

COMMIT;
