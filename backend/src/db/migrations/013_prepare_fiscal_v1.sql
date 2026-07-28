BEGIN;

CREATE TABLE IF NOT EXISTS configuracoes_fiscais_empresa (
  id SERIAL PRIMARY KEY,
  razao_social VARCHAR(160), nome_fantasia VARCHAR(160), cnpj VARCHAR(20),
  inscricao_estadual VARCHAR(30), inscricao_municipal VARCHAR(30),
  regime_tributario VARCHAR(80), crt VARCHAR(10), estado VARCHAR(2), cidade VARCHAR(100),
  cep VARCHAR(12), endereco TEXT, numero VARCHAR(20), bairro VARCHAR(100), complemento VARCHAR(120),
  ambiente_fiscal VARCHAR(20) NOT NULL DEFAULT 'homologacao' CHECK (ambiente_fiscal IN ('homologacao','producao')),
  provedor_fiscal VARCHAR(80), emitir_nfce BOOLEAN NOT NULL DEFAULT FALSE, emitir_nfe BOOLEAN NOT NULL DEFAULT FALSE,
  serie_nfce INTEGER, serie_nfe INTEGER, proximo_numero_nfce BIGINT, proximo_numero_nfe BIGINT,
  csc_id VARCHAR(80), csc_hash TEXT, certificado_configurado BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes TEXT, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produto_fiscal (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  produto_variacao_id INTEGER REFERENCES produto_variacoes(id) ON DELETE CASCADE,
  ncm VARCHAR(12), cest VARCHAR(12), cfop VARCHAR(8), origem VARCHAR(4),
  unidade_comercial VARCHAR(10) NOT NULL DEFAULT 'UN', csosn VARCHAR(10),
  cst_icms VARCHAR(10), cst_pis VARCHAR(10), cst_cofins VARCHAR(10),
  aliquota_icms NUMERIC(10,4) NOT NULL DEFAULT 0, aliquota_pis NUMERIC(10,4) NOT NULL DEFAULT 0,
  aliquota_cofins NUMERIC(10,4) NOT NULL DEFAULT 0, codigo_beneficio_fiscal VARCHAR(30),
  ativo BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_fiscal_produto_base ON produto_fiscal(produto_id) WHERE produto_variacao_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_fiscal_variacao ON produto_fiscal(produto_id,produto_variacao_id) WHERE produto_variacao_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS documentos_fiscais (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES vendas(id) ON DELETE RESTRICT,
  tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('nfce','nfe')),
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','pronto','emitido','erro','cancelado')),
  ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao','producao')),
  serie INTEGER, numero BIGINT, chave_acesso VARCHAR(60), protocolo VARCHAR(80), xml_url TEXT, pdf_url TEXT,
  mensagem_erro TEXT, payload_json JSONB NOT NULL DEFAULT '{}'::jsonb, resposta_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  emitido_at TIMESTAMP, cancelado_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_documentos_fiscais_venda ON documentos_fiscais(venda_id);
CREATE INDEX IF NOT EXISTS idx_documentos_fiscais_status ON documentos_fiscais(status,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documento_fiscal_ativo_venda ON documentos_fiscais(venda_id) WHERE status <> 'cancelado';

INSERT INTO permissoes_usuario (usuario_id, permissao, permitido)
SELECT u.id, p.permissao, TRUE FROM usuarios u
CROSS JOIN (VALUES ('fiscal.ver'),('fiscal.gerenciar')) p(permissao)
WHERE u.tipo IN ('dona','super_admin')
ON CONFLICT (usuario_id, permissao) DO UPDATE SET permitido=TRUE;

COMMIT;
