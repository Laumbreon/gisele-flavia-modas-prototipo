BEGIN;

CREATE TABLE IF NOT EXISTS cliente_recuperacao_senha (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  codigo_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  ip_solicitacao VARCHAR(80) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cliente_reset_cliente ON cliente_recuperacao_senha(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_reset_email ON cliente_recuperacao_senha(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_cliente_reset_expires ON cliente_recuperacao_senha(expires_at);
CREATE INDEX IF NOT EXISTS idx_cliente_reset_used ON cliente_recuperacao_senha(used_at);

COMMIT;
