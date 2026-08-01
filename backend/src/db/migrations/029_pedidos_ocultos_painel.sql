ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS excluido_painel BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_vendas_excluido_painel
  ON vendas(excluido_painel, created_at DESC);
