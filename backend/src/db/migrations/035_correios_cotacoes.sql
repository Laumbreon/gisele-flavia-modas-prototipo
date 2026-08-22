CREATE TABLE IF NOT EXISTS correios_cotacoes (
  id UUID PRIMARY KEY,
  cep_origem VARCHAR(8) NOT NULL,
  cep_destino VARCHAR(8) NOT NULL,
  servico_codigo VARCHAR(20) NOT NULL,
  servico_nome VARCHAR(120),
  valor NUMERIC(10,2) NOT NULL,
  prazo_dias_uteis INTEGER,
  peso_gramas INTEGER NOT NULL,
  comprimento_cm NUMERIC(8,2) NOT NULL,
  largura_cm NUMERIC(8,2) NOT NULL,
  altura_cm NUMERIC(8,2) NOT NULL,
  resposta_sanitizada JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT correios_cotacoes_cep_origem_check CHECK (cep_origem ~ '^[0-9]{8}$'),
  CONSTRAINT correios_cotacoes_cep_destino_check CHECK (cep_destino ~ '^[0-9]{8}$'),
  CONSTRAINT correios_cotacoes_valor_check CHECK (valor >= 0),
  CONSTRAINT correios_cotacoes_prazo_check CHECK (prazo_dias_uteis IS NULL OR prazo_dias_uteis >= 0),
  CONSTRAINT correios_cotacoes_peso_check CHECK (peso_gramas > 0),
  CONSTRAINT correios_cotacoes_dimensoes_check CHECK (comprimento_cm > 0 AND largura_cm > 0 AND altura_cm > 0)
);

CREATE INDEX IF NOT EXISTS idx_correios_cotacoes_expires_at ON correios_cotacoes(expires_at);
CREATE INDEX IF NOT EXISTS idx_correios_cotacoes_cep_destino ON correios_cotacoes(cep_destino);
