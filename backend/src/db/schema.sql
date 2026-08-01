-- Schema inicial consolidado - Gisele Flavia Modas

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash TEXT,
  tipo VARCHAR(20) NOT NULL DEFAULT 'funcionario' CHECK (tipo IN ('dona', 'funcionario', 'super_admin')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissoes_usuario (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  permissao VARCHAR(80) NOT NULL,
  permitido BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, permissao)
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160),
  cpf VARCHAR(20),
  telefone VARCHAR(30),
  whatsapp VARCHAR(30),
  cep VARCHAR(12),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  endereco TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cliente_compras_salvas (
  cliente_id INTEGER PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
  carrinho JSONB NOT NULL DEFAULT '[]'::jsonb,
  favoritos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(140) NOT NULL,
  categoria_fornecida VARCHAR(120),
  contato VARCHAR(120),
  whatsapp VARCHAR(30),
  email VARCHAR(160),
  cpf VARCHAR(20),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  ultima_compra DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
  nome VARCHAR(140) NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_promocional NUMERIC(10,2),
  status VARCHAR(30) NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS produto_variacoes (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tamanho VARCHAR(10) NOT NULL,
  cor VARCHAR(60) NOT NULL,
  sku VARCHAR(80) UNIQUE,
  codigo_barras VARCHAR(80) UNIQUE,
  codigo_interno VARCHAR(80),
  preco_adicional NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(10,2),
  preco_promocional NUMERIC(10,2),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (produto_id, tamanho, cor)
);

CREATE TABLE IF NOT EXISTS estoque (
  id SERIAL PRIMARY KEY,
  produto_variacao_id INTEGER NOT NULL UNIQUE REFERENCES produto_variacoes(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  quantidade_minima INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_minima >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maquininhas (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'loja',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes TEXT,
  codigo_externo VARCHAR(120),
  provedor_pagamento VARCHAR(40) NOT NULL DEFAULT 'manual',
  mercado_pago_pos_id VARCHAR(160),
  mercado_pago_store_id VARCHAR(160),
  mercado_pago_integrada BOOLEAN NOT NULL DEFAULT FALSE,
  pdv_codigo VARCHAR(60),
  terminal_tipo VARCHAR(40),
  ordem_exibicao INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS vendas (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  frete_valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  frete_tipo VARCHAR(60),
  cep_entrega VARCHAR(12),
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_pago NUMERIC(10,2) NOT NULL DEFAULT 0,
  troco NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_faltante NUMERIC(10,2) NOT NULL DEFAULT 0,
  forma_pagamento VARCHAR(60),
  parcelas SMALLINT NOT NULL DEFAULT 1 CHECK (parcelas BETWEEN 1 AND 12),
  canal_venda VARCHAR(30) NOT NULL DEFAULT 'loja_fisica',
  origem_venda VARCHAR(30),
  tem_entrega BOOLEAN NOT NULL DEFAULT FALSE,
  status_pagamento VARCHAR(30) DEFAULT 'pago',
  status_entrega VARCHAR(30) DEFAULT 'sem_entrega',
  caixa_id INTEGER REFERENCES caixas(id) ON DELETE SET NULL,
  maquininha_id INTEGER REFERENCES maquininhas(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'finalizada',
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS itens_venda (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
  produto_variacao_id INTEGER REFERENCES produto_variacoes(id) ON DELETE SET NULL,
  produto_nome VARCHAR(140) NOT NULL,
  tamanho VARCHAR(10),
  cor VARCHAR(60),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
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

CREATE INDEX IF NOT EXISTS idx_pagamentos_venda_venda_id ON pagamentos_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_venda_caixa_id ON pagamentos_venda(caixa_id);

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
  produto_variacao_id INTEGER REFERENCES produto_variacoes(id) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  motivo VARCHAR(160) NOT NULL,
  responsavel VARCHAR(120),
  observacoes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_caixas_status_data ON caixas(status, data_abertura DESC);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_caixa_id ON caixa_movimentacoes(caixa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentacoes_venda_id ON caixa_movimentacoes(venda_id);

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

CREATE TABLE IF NOT EXISTS configuracoes_loja (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT,
  descricao TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracoes_seguranca (
  id SERIAL PRIMARY KEY, chave VARCHAR(100) NOT NULL UNIQUE, valor TEXT, descricao TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_pins (
  id SERIAL PRIMARY KEY, chave VARCHAR(100) NOT NULL UNIQUE DEFAULT 'principal', pin_hash TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE, updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);



