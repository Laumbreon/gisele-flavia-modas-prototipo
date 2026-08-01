ALTER TABLE maquininhas
  ADD COLUMN IF NOT EXISTS mercado_pago_terminal_id TEXT,
  ADD COLUMN IF NOT EXISTS mercado_pago_serial TEXT,
  ADD COLUMN IF NOT EXISTS mercado_pago_modo VARCHAR(20) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS mercado_pago_ambiente VARCHAR(20) NOT NULL DEFAULT 'producao',
  ADD COLUMN IF NOT EXISTS mercado_pago_operacional BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mercado_pago_ativo BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS mercado_pago_point_orders (
  id BIGSERIAL PRIMARY KEY,
  venda_id BIGINT NULL REFERENCES vendas(id),
  caixa_id BIGINT NOT NULL REFERENCES caixas(id),
  maquininha_id BIGINT NOT NULL REFERENCES maquininhas(id),
  terminal_id TEXT NOT NULL,
  order_id TEXT NULL,
  external_reference TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'creating',
  status_detail TEXT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  forma_pagamento VARCHAR(20) NOT NULL,
  request_payload JSONB NULL,
  response_payload JSONB NULL,
  last_response_payload JSONB NULL,
  erro TEXT NULL,
  approved_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_point_orders_venda ON mercado_pago_point_orders(venda_id);
CREATE INDEX IF NOT EXISTS idx_mp_point_orders_maquininha ON mercado_pago_point_orders(maquininha_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_point_orders_order ON mercado_pago_point_orders(order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_point_orders_external_reference ON mercado_pago_point_orders(external_reference);
CREATE INDEX IF NOT EXISTS idx_mp_point_orders_status ON mercado_pago_point_orders(status);
