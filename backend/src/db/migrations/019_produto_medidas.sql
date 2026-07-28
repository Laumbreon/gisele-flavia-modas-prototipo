BEGIN;
CREATE TABLE IF NOT EXISTS produto_medidas (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tamanho VARCHAR(30),
  busto VARCHAR(50),
  cintura VARCHAR(50),
  quadril VARCHAR(50),
  comprimento VARCHAR(50),
  observacao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_produto_medidas_produto ON produto_medidas(produto_id, ordem, id);
COMMIT;
