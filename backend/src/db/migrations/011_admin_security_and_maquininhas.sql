BEGIN;

DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'usuarios' AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE usuarios DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_tipo_check CHECK (tipo IN ('dona', 'funcionario', 'super_admin'));

CREATE TABLE IF NOT EXISTS configuracoes_seguranca (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT,
  descricao TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_pins (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE DEFAULT 'principal',
  pin_hash TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE maquininhas
  ADD COLUMN IF NOT EXISTS codigo_externo VARCHAR(120),
  ADD COLUMN IF NOT EXISTS provedor_pagamento VARCHAR(40) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS mercado_pago_pos_id VARCHAR(160),
  ADD COLUMN IF NOT EXISTS mercado_pago_store_id VARCHAR(160),
  ADD COLUMN IF NOT EXISTS mercado_pago_integrada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pdv_codigo VARCHAR(60),
  ADD COLUMN IF NOT EXISTS terminal_tipo VARCHAR(40),
  ADD COLUMN IF NOT EXISTS ordem_exibicao INTEGER NOT NULL DEFAULT 0;

UPDATE maquininhas SET pdv_codigo = 'pdv_loja_1' WHERE nome = 'Maquininha Loja 1' AND pdv_codigo IS NULL;
UPDATE maquininhas SET pdv_codigo = 'pdv_loja_2' WHERE nome = 'Maquininha Loja 2' AND pdv_codigo IS NULL;
UPDATE maquininhas SET pdv_codigo = 'motoboy' WHERE nome = 'Maquininha Motoboy' AND pdv_codigo IS NULL;

INSERT INTO maquininhas (nome, tipo, pdv_codigo, terminal_tipo, ativo, observacoes)
SELECT v.nome, v.tipo, v.pdv_codigo, v.terminal_tipo, TRUE, 'Seed administrativo'
FROM (VALUES
  ('Maquininha Loja 1','loja','pdv_loja_1','loja'),
  ('Maquininha Loja 2','loja','pdv_loja_2','loja'),
  ('Maquininha Motoboy','motoboy','motoboy','motoboy')
) v(nome,tipo,pdv_codigo,terminal_tipo)
WHERE NOT EXISTS (SELECT 1 FROM maquininhas m WHERE m.nome = v.nome);

COMMIT;
