BEGIN;

ALTER TABLE produto_midias ADD COLUMN IF NOT EXISTS alt_text VARCHAR(180);
CREATE INDEX IF NOT EXISTS idx_produto_variacoes_produto_ativo ON produto_variacoes(produto_id, ativo);
CREATE INDEX IF NOT EXISTS idx_estoque_quantidade ON estoque(quantidade);

COMMIT;
