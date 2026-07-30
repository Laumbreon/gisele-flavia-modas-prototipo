BEGIN;

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS senha_hash TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultimo_login_em TIMESTAMP;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_email_login_unico
  ON clientes (LOWER(email))
  WHERE email IS NOT NULL AND BTRIM(email) <> '' AND senha_hash IS NOT NULL;

COMMIT;
