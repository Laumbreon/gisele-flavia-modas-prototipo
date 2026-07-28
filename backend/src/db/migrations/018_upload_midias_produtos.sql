BEGIN;
ALTER TABLE produto_midias ADD COLUMN IF NOT EXISTS alt_text VARCHAR(180);
ALTER TABLE produto_midias ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_produto_midias_produto ON produto_midias(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_midias_principal ON produto_midias(produto_id, principal);
CREATE INDEX IF NOT EXISTS idx_produto_midias_ordem ON produto_midias(produto_id, ordem, id);
COMMIT;
