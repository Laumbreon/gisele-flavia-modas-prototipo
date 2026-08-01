BEGIN;

ALTER TABLE mercado_pago_config
  ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS access_token_iv VARCHAR(64),
  ADD COLUMN IF NOT EXISTS access_token_tag VARCHAR(64),
  ADD COLUMN IF NOT EXISTS webhook_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret_iv VARCHAR(64),
  ADD COLUMN IF NOT EXISTS webhook_secret_tag VARCHAR(64),
  ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMIT;
