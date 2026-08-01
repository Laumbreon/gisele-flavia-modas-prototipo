CREATE TABLE IF NOT EXISTS cliente_compras_salvas (
  cliente_id INTEGER PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
  carrinho JSONB NOT NULL DEFAULT '[]'::jsonb,
  favoritos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
