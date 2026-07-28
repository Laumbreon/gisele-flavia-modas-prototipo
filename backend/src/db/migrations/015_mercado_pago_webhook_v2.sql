BEGIN;

ALTER TABLE mercado_pago_pagamentos
  ADD COLUMN IF NOT EXISTS webhook_event_id VARCHAR(160),
  ADD COLUMN IF NOT EXISTS webhook_type VARCHAR(80),
  ADD COLUMN IF NOT EXISTS webhook_action VARCHAR(120),
  ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(40),
  ADD COLUMN IF NOT EXISTS payment_status_detail VARCHAR(160),
  ADD COLUMN IF NOT EXISTS payment_method_id VARCHAR(80),
  ADD COLUMN IF NOT EXISTS payment_type_id VARCHAR(80),
  ADD COLUMN IF NOT EXISTS payer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS transaction_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS date_approved TIMESTAMP,
  ADD COLUMN IF NOT EXISTS raw_webhook_json JSONB,
  ADD COLUMN IF NOT EXISTS raw_payment_json JSONB,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS processado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS mercado_pago_webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  event_id VARCHAR(160),
  type VARCHAR(80),
  action VARCHAR(120),
  payment_id VARCHAR(160),
  merchant_order_id VARCHAR(160),
  external_reference VARCHAR(160),
  venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
  status_processamento VARCHAR(20) NOT NULL DEFAULT 'recebido'
    CHECK (status_processamento IN ('recebido','processado','ignorado','erro')),
  mensagem TEXT,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mp_webhook_logs_event ON mercado_pago_webhook_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_mp_webhook_logs_payment ON mercado_pago_webhook_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_mp_webhook_logs_venda ON mercado_pago_webhook_logs(venda_id);
CREATE INDEX IF NOT EXISTS idx_mp_webhook_logs_status ON mercado_pago_webhook_logs(status_processamento, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mp_pagamentos_payment ON mercado_pago_pagamentos(payment_id);

COMMIT;
