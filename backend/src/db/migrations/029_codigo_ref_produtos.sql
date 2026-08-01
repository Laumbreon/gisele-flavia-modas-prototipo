ALTER TABLE produto_variacoes
  ADD COLUMN IF NOT EXISTS codigo_ref VARCHAR(80) NULL;

ALTER TABLE itens_venda
  ADD COLUMN IF NOT EXISTS codigo_ref VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(80) NULL;

CREATE INDEX IF NOT EXISTS idx_produto_variacoes_codigo_ref
  ON produto_variacoes (codigo_ref);
