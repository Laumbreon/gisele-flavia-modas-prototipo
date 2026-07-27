-- Fase Caixa 1 - controle de abertura, fechamento e movimentacoes

CREATE TABLE IF NOT EXISTS maquininhas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'loja',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caixas (
  id SERIAL PRIMARY KEY,
  usuario_abertura_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_fechamento_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  data_abertura TIMESTAMP NOT NULL DEFAULT NOW(),
  data_fechamento TIMESTAMP,
  valor_inicial NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_informado_dinheiro NUMERIC(10,2),
  valor_informado_pix NUMERIC(10,2),
  valor_informado_debito NUMERIC(10,2),
  valor_informado_credito NUMERIC(10,2),
  valor_sistema_dinheiro NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_sistema_pix NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_sistema_debito NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_sistema_credito NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_sistema NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_informado NUMERIC(10,2) NOT NULL DEFAULT 0,
  divergencia NUMERIC(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'aberto',
  observacoes_abertura TEXT,
  observacoes_fechamento TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_caixas_um_aberto
  ON caixas (status)
  WHERE status = 'aberto';

CREATE TABLE IF NOT EXISTS caixa_movimentacoes (
  id SERIAL PRIMARY KEY,
  caixa_id INTEGER NOT NULL REFERENCES caixas(id) ON DELETE CASCADE,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo VARCHAR(30) NOT NULL,
  forma_pagamento VARCHAR(30),
  valor NUMERIC(10,2) NOT NULL,
  descricao TEXT,
  venda_id INTEGER REFERENCES vendas(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagamentos_venda (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  caixa_id INTEGER REFERENCES caixas(id) ON DELETE SET NULL,
  maquininha_id INTEGER REFERENCES maquininhas(id) ON DELETE SET NULL,
  forma_pagamento VARCHAR(30) NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pago',
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS caixa_id INTEGER;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS maquininha_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendas_caixa_id'
  ) THEN
    ALTER TABLE vendas
      ADD CONSTRAINT fk_vendas_caixa_id
      FOREIGN KEY (caixa_id) REFERENCES caixas(id) ON DELETE SET NULL
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_vendas_maquininha_id'
  ) THEN
    ALTER TABLE vendas
      ADD CONSTRAINT fk_vendas_maquininha_id
      FOREIGN KEY (maquininha_id) REFERENCES maquininhas(id) ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_caixas_status_data ON caixas(status, data_abertura DESC);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_caixa_id ON caixa_movimentacoes(caixa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_venda_id ON caixa_movimentacoes(venda_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venda_venda_id ON pagamentos_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venda_caixa_id ON pagamentos_venda(caixa_id);

INSERT INTO maquininhas (nome, tipo, ativo, observacoes)
SELECT 'Maquininha Loja 1', 'loja', TRUE, 'Seed inicial'
WHERE NOT EXISTS (SELECT 1 FROM maquininhas WHERE nome = 'Maquininha Loja 1');

INSERT INTO maquininhas (nome, tipo, ativo, observacoes)
SELECT 'Maquininha Loja 2', 'loja', TRUE, 'Seed inicial'
WHERE NOT EXISTS (SELECT 1 FROM maquininhas WHERE nome = 'Maquininha Loja 2');

INSERT INTO maquininhas (nome, tipo, ativo, observacoes)
SELECT 'Maquininha Motoboy', 'motoboy', TRUE, 'Seed inicial'
WHERE NOT EXISTS (SELECT 1 FROM maquininhas WHERE nome = 'Maquininha Motoboy');
