-- Adiciona suporte inicial para fotos e videos de produtos

CREATE TABLE IF NOT EXISTS produto_midias (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('imagem', 'video')),
  url TEXT NOT NULL,
  titulo VARCHAR(140),
  ordem INTEGER NOT NULL DEFAULT 0,
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produto_midias_produto_id ON produto_midias(produto_id);
