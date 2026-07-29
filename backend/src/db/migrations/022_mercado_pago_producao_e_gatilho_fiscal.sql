BEGIN;

ALTER TABLE mercado_pago_pagamentos
  ADD COLUMN IF NOT EXISTS valor NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS valor_aprovado NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_paid_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS api_consulta_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS resultado_processamento VARCHAR(60),
  ADD COLUMN IF NOT EXISTS erro_processamento TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_triggered_at TIMESTAMP;

ALTER TABLE mercado_pago_webhook_logs
  ADD COLUMN IF NOT EXISTS assinatura_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS api_consulta_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS headers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS resultado_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS erro TEXT;

ALTER TABLE pagamentos_venda
  ADD COLUMN IF NOT EXISTS mercado_pago_payment_id VARCHAR(160);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pagamentos_venda_mp_payment
  ON pagamentos_venda(mercado_pago_payment_id)
  WHERE mercado_pago_payment_id IS NOT NULL;

DO $$
BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uq_mp_pagamentos_payment_id
    ON mercado_pago_pagamentos(payment_id)
    WHERE payment_id IS NOT NULL;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'payment_id duplicado em dados antigos; idempotência seguirá protegida pela transação até saneamento.';
END $$;

COMMIT;
