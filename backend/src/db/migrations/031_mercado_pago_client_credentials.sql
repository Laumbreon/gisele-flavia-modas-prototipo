BEGIN;

ALTER TABLE mercado_pago_config
  ADD COLUMN IF NOT EXISTS client_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS client_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS client_secret_iv VARCHAR(64),
  ADD COLUMN IF NOT EXISTS client_secret_tag VARCHAR(64);

COMMIT;
