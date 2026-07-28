BEGIN;

CREATE TABLE IF NOT EXISTS mercado_pago_config (
  id SERIAL PRIMARY KEY,
  ambiente VARCHAR(20) NOT NULL DEFAULT 'sandbox' CHECK (ambiente IN ('sandbox','producao')),
  ativo BOOLEAN NOT NULL DEFAULT FALSE,
  public_key TEXT,
  access_token_configurado BOOLEAN NOT NULL DEFAULT FALSE,
  webhook_url TEXT,
  success_url TEXT,
  failure_url TEXT,
  pending_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mercado_pago_pagamentos (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE RESTRICT,
  preference_id VARCHAR(160) NOT NULL,
  init_point TEXT,
  sandbox_init_point TEXT,
  external_reference VARCHAR(160) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'criado',
  status_detail VARCHAR(160),
  payment_id VARCHAR(160),
  merchant_order_id VARCHAR(160),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  resposta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_pagamentos_venda ON mercado_pago_pagamentos(venda_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_pagamentos_preference ON mercado_pago_pagamentos(preference_id);

COMMIT;
