ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS canal_venda VARCHAR(30) NOT NULL DEFAULT 'loja_fisica',
  ADD COLUMN IF NOT EXISTS origem_venda VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tem_entrega BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(30) DEFAULT 'pago',
  ADD COLUMN IF NOT EXISTS status_entrega VARCHAR(30) DEFAULT 'sem_entrega',
  ADD COLUMN IF NOT EXISTS caixa_id INTEGER,
  ADD COLUMN IF NOT EXISTS maquininha_id INTEGER;

CREATE TABLE IF NOT EXISTS venda_entregas (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  tipo_entrega VARCHAR(30) NOT NULL,
  status_entrega VARCHAR(30) NOT NULL DEFAULT 'pendente',
  valor_frete NUMERIC(10,2) NOT NULL DEFAULT 0,
  destinatario_nome VARCHAR(120),
  destinatario_telefone VARCHAR(30),
  cep VARCHAR(12),
  estado VARCHAR(2),
  cidade VARCHAR(100),
  bairro VARCHAR(100),
  endereco TEXT,
  numero VARCHAR(20),
  complemento VARCHAR(120),
  referencia TEXT,
  transportadora VARCHAR(60),
  codigo_rastreio VARCHAR(80),
  motoboy_nome VARCHAR(120),
  data_prevista TIMESTAMP,
  data_entrega TIMESTAMP,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venda_entregas_venda_id ON venda_entregas(venda_id);
