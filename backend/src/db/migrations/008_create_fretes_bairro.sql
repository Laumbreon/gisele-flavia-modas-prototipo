CREATE TABLE IF NOT EXISTS fretes_bairro (
  id SERIAL PRIMARY KEY,
  bairro VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  estado VARCHAR(2) NOT NULL DEFAULT 'SP',
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  prazo_estimado VARCHAR(80),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fretes_bairro_busca
  ON fretes_bairro (LOWER(bairro), LOWER(cidade), LOWER(estado));
