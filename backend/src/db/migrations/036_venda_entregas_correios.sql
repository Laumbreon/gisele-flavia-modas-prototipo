BEGIN;

ALTER TABLE venda_entregas
  ADD COLUMN IF NOT EXISTS correios_cotacao_id UUID,
  ADD COLUMN IF NOT EXISTS correios_servico_codigo VARCHAR(20),
  ADD COLUMN IF NOT EXISTS correios_servico_nome VARCHAR(120),
  ADD COLUMN IF NOT EXISTS prazo_dias_uteis INTEGER;

ALTER TABLE venda_entregas
  DROP CONSTRAINT IF EXISTS venda_entregas_prazo_dias_uteis_check;

ALTER TABLE venda_entregas
  ADD CONSTRAINT venda_entregas_prazo_dias_uteis_check
  CHECK (prazo_dias_uteis IS NULL OR prazo_dias_uteis >= 0);

CREATE INDEX IF NOT EXISTS idx_venda_entregas_correios_cotacao
  ON venda_entregas(correios_cotacao_id)
  WHERE correios_cotacao_id IS NOT NULL;

COMMIT;
