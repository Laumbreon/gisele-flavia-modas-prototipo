BEGIN;

WITH catalogo(nome, categoria, descricao, preco, preco_promocional) AS (
  VALUES
    ('Vestido Floral Midi', 'Vestidos', 'Vestido midi com estampa floral, tecido leve e caimento delicado.', 159.90, 139.90),
    ('Blusa Canelada', 'Blusas', 'Blusa canelada confortável e versátil para compor looks casuais.', 69.90, NULL),
    ('Calça Pantalona', 'Calças', 'Calça pantalona de cintura alta com caimento fluido e elegante.', 179.90, 159.90),
    ('Saia Plissada', 'Saias', 'Saia midi plissada com movimento leve e acabamento sofisticado.', 119.90, 99.90),
    ('Conjunto Alfaiataria', 'Conjuntos', 'Conjunto feminino de alfaiataria com blazer e calça coordenados.', 249.90, 219.90),
    ('Cropped Básico', 'Croppeds', 'Cropped básico de toque macio para combinações práticas do dia a dia.', 49.90, NULL),
    ('Vestido Tubinho', 'Vestidos', 'Vestido tubinho de modelagem clássica, ideal para ocasiões especiais.', 139.90, 119.90),
    ('Camisa Social Feminina', 'Camisas', 'Camisa social feminina com corte moderno e acabamento refinado.', 109.90, NULL)
)
INSERT INTO produtos (nome, categoria, descricao, preco, preco_promocional, status)
SELECT c.nome, c.categoria, c.descricao, c.preco, c.preco_promocional, 'ativo'
FROM catalogo c
WHERE NOT EXISTS (
  SELECT 1 FROM produtos p WHERE LOWER(p.nome) = LOWER(c.nome)
);

WITH catalogo(nome, categoria, descricao, preco, preco_promocional) AS (
  VALUES
    ('Vestido Floral Midi', 'Vestidos', 'Vestido midi com estampa floral, tecido leve e caimento delicado.', 159.90, 139.90),
    ('Blusa Canelada', 'Blusas', 'Blusa canelada confortável e versátil para compor looks casuais.', 69.90, NULL),
    ('Calça Pantalona', 'Calças', 'Calça pantalona de cintura alta com caimento fluido e elegante.', 179.90, 159.90),
    ('Saia Plissada', 'Saias', 'Saia midi plissada com movimento leve e acabamento sofisticado.', 119.90, 99.90),
    ('Conjunto Alfaiataria', 'Conjuntos', 'Conjunto feminino de alfaiataria com blazer e calça coordenados.', 249.90, 219.90),
    ('Cropped Básico', 'Croppeds', 'Cropped básico de toque macio para combinações práticas do dia a dia.', 49.90, NULL),
    ('Vestido Tubinho', 'Vestidos', 'Vestido tubinho de modelagem clássica, ideal para ocasiões especiais.', 139.90, 119.90),
    ('Camisa Social Feminina', 'Camisas', 'Camisa social feminina com corte moderno e acabamento refinado.', 109.90, NULL)
)
UPDATE produtos p
SET categoria = c.categoria,
    descricao = c.descricao,
    preco = c.preco,
    preco_promocional = c.preco_promocional,
    status = 'ativo',
    updated_at = NOW()
FROM catalogo c
WHERE LOWER(p.nome) = LOWER(c.nome);

WITH midias(produto_nome, tipo, url, titulo, alt_text, ordem, principal) AS (
  VALUES
    ('Vestido Floral Midi', 'imagem', 'assets/produtos/vestido-floral-midi-1.jpg', 'Imagem principal', 'Vestido Floral Midi', 1, TRUE),
    ('Vestido Floral Midi', 'imagem', 'assets/produtos/vestido-floral-midi-2.jpg', 'Detalhe do vestido', 'Vestido Floral Midi', 2, FALSE),
    ('Vestido Floral Midi', 'video', 'assets/produtos/vestido-floral-midi-video.mp4', 'Vídeo do vestido', 'Vestido Floral Midi', 3, FALSE),
    ('Blusa Canelada', 'imagem', 'assets/produtos/blusa-canelada-1.jpg', 'Imagem principal', 'Blusa Canelada', 1, TRUE),
    ('Blusa Canelada', 'video', 'assets/produtos/blusa-canelada-video.mp4', 'Vídeo da blusa', 'Blusa Canelada', 2, FALSE),
    ('Calça Pantalona', 'imagem', 'assets/produtos/calca-pantalona-1.jpg', 'Imagem principal', 'Calça Pantalona', 1, TRUE),
    ('Calça Pantalona', 'imagem', 'assets/produtos/calca-pantalona-2.jpg', 'Detalhe da calça', 'Calça Pantalona', 2, FALSE),
    ('Saia Plissada', 'imagem', 'assets/produtos/saia-plissada-1.jpg', 'Imagem principal', 'Saia Plissada', 1, TRUE),
    ('Conjunto Alfaiataria', 'imagem', 'assets/produtos/conjunto-alfaiataria-1.jpg', 'Imagem principal', 'Conjunto Alfaiataria', 1, TRUE),
    ('Conjunto Alfaiataria', 'video', 'assets/produtos/conjunto-alfaiataria-video.mp4', 'Vídeo do conjunto', 'Conjunto Alfaiataria', 2, FALSE),
    ('Cropped Básico', 'imagem', 'assets/produtos/cropped-basico-1.jpg', 'Imagem principal', 'Cropped Básico', 1, TRUE),
    ('Vestido Tubinho', 'imagem', 'assets/produtos/vestido-tubinho-1.jpg', 'Imagem principal', 'Vestido Tubinho', 1, TRUE),
    ('Vestido Tubinho', 'video', 'assets/produtos/vestido-tubinho-video.mp4', 'Vídeo do vestido', 'Vestido Tubinho', 2, FALSE),
    ('Camisa Social Feminina', 'imagem', 'assets/produtos/camisa-social-feminina-1.jpg', 'Imagem principal', 'Camisa Social Feminina', 1, TRUE)
)
INSERT INTO produto_midias (produto_id, tipo, url, titulo, alt_text, ordem, principal)
SELECT p.id, m.tipo, m.url, m.titulo, m.alt_text, m.ordem, m.principal
FROM midias m
JOIN produtos p ON LOWER(p.nome) = LOWER(m.produto_nome)
WHERE NOT EXISTS (
  SELECT 1
  FROM produto_midias pm
  WHERE pm.produto_id = p.id AND pm.url = m.url
);

WITH variacoes(produto_nome, tamanho, cor, sku) AS (
  VALUES
    ('Vestido Floral Midi', 'P', 'Rosa', 'VEST-FLORAL-P-ROSA'),
    ('Vestido Floral Midi', 'M', 'Rosa', 'VEST-FLORAL-M-ROSA'),
    ('Vestido Floral Midi', 'G', 'Verde', 'VEST-FLORAL-G-VERDE'),
    ('Blusa Canelada', 'P', 'Branco', 'BLUSA-CANELADA-P-BRANCO'),
    ('Blusa Canelada', 'M', 'Rosa', 'BLUSA-CANELADA-M-ROSA'),
    ('Blusa Canelada', 'G', 'Preto', 'BLUSA-CANELADA-G-PRETO'),
    ('Calça Pantalona', 'P', 'Preto', 'CALCA-PANTALONA-P-PRETO'),
    ('Calça Pantalona', 'M', 'Caramelo', 'CALCA-PANTALONA-M-CARAMELO'),
    ('Calça Pantalona', 'G', 'Verde', 'CALCA-PANTALONA-G-VERDE'),
    ('Saia Plissada', 'P', 'Rosa', 'SAIA-PLISSADA-P-ROSA'),
    ('Saia Plissada', 'M', 'Preto', 'SAIA-PLISSADA-M-PRETO'),
    ('Saia Plissada', 'G', 'Natural', 'SAIA-PLISSADA-G-NATURAL'),
    ('Conjunto Alfaiataria', 'P', 'Preto', 'CONJ-ALFAIATARIA-P-PRETO'),
    ('Conjunto Alfaiataria', 'M', 'Natural', 'CONJ-ALFAIATARIA-M-NATURAL'),
    ('Conjunto Alfaiataria', 'G', 'Rosa', 'CONJ-ALFAIATARIA-G-ROSA'),
    ('Cropped Básico', 'P', 'Branco', 'CROPPED-BASICO-P-BRANCO'),
    ('Cropped Básico', 'M', 'Preto', 'CROPPED-BASICO-M-PRETO'),
    ('Cropped Básico', 'G', 'Rosa', 'CROPPED-BASICO-G-ROSA'),
    ('Vestido Tubinho', 'P', 'Preto', 'VEST-TUBINHO-P-PRETO'),
    ('Vestido Tubinho', 'M', 'Vermelho', 'VEST-TUBINHO-M-VERMELHO'),
    ('Vestido Tubinho', 'G', 'Rosa', 'VEST-TUBINHO-G-ROSA'),
    ('Camisa Social Feminina', 'P', 'Branco', 'CAMISA-SOCIAL-P-BRANCO'),
    ('Camisa Social Feminina', 'M', 'Azul', 'CAMISA-SOCIAL-M-AZUL'),
    ('Camisa Social Feminina', 'G', 'Rosa', 'CAMISA-SOCIAL-G-ROSA')
)
INSERT INTO produto_variacoes (produto_id, tamanho, cor, sku, ativo)
SELECT p.id, v.tamanho, v.cor, v.sku, TRUE
FROM variacoes v
JOIN produtos p ON LOWER(p.nome) = LOWER(v.produto_nome)
ON CONFLICT (produto_id, tamanho, cor)
DO UPDATE SET sku = EXCLUDED.sku, ativo = TRUE, updated_at = NOW();

INSERT INTO estoque (produto_variacao_id, quantidade, quantidade_minima)
SELECT pv.id,
       CASE pv.tamanho WHEN 'P' THEN 6 WHEN 'M' THEN 9 ELSE 5 END,
       2
FROM produto_variacoes pv
JOIN produtos p ON p.id = pv.produto_id
WHERE p.nome IN (
  'Vestido Floral Midi', 'Blusa Canelada', 'Calça Pantalona', 'Saia Plissada',
  'Conjunto Alfaiataria', 'Cropped Básico', 'Vestido Tubinho', 'Camisa Social Feminina'
)
ON CONFLICT (produto_variacao_id)
DO UPDATE SET quantidade = EXCLUDED.quantidade,
              quantidade_minima = EXCLUDED.quantidade_minima,
              updated_at = NOW();

COMMIT;
