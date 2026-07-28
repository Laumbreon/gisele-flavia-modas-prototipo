BEGIN;

ALTER TABLE produto_variacoes ALTER COLUMN tamanho TYPE VARCHAR(30);
ALTER TABLE itens_venda ALTER COLUMN tamanho TYPE VARCHAR(30);

CREATE TABLE IF NOT EXISTS categorias_produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  slug VARCHAR(140) UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO categorias_produtos (nome,slug,ordem) VALUES
 ('Vestidos','vestidos',10),('Blusas','blusas',20),('Calças','calcas',30),('Saias','saias',40),
 ('Shorts','shorts',50),('Conjuntos','conjuntos',60),('Macacões','macacoes',70),('Croppeds','croppeds',80),
 ('Body','body',90),('Calçados','calcados',100),('Bolsas','bolsas',110),('Acessórios','acessorios',120),
 ('Moda Fitness','moda-fitness',130),('Moda Praia','moda-praia',140),('Novidades','novidades',150),('Promoções','promocoes',160)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_categorias_produtos_ativo_ordem ON categorias_produtos(ativo,ordem,nome);
COMMIT;
