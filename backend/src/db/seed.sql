-- Dados iniciais de exemplo - Gisele Flavia Modas

INSERT INTO usuarios (nome, email, senha_hash, tipo, ativo)
VALUES
  ('Gisele Flavia', 'dona@giseleflavia.com.br', 'EXEMPLO_TROCAR_EM_PRODUCAO_NAO_USAR', 'dona', TRUE)
ON CONFLICT (email) DO UPDATE
SET nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo,
    ativo = EXCLUDED.ativo,
    updated_at = NOW();

INSERT INTO permissoes_usuario (usuario_id, permissao, permitido)
SELECT u.id, p.permissao, TRUE
FROM usuarios u
CROSS JOIN (VALUES
  ('vendas.criar'),
  ('vendas.cancelar'),
  ('produtos.criar'),
  ('produtos.editar'),
  ('produtos.excluir'),
  ('estoque.ver'),
  ('estoque.editar'),
  ('fornecedores.ver'),
  ('fornecedores.editar'),
  ('relatorios.ver'),
  ('configuracoes.editar'),
  ('funcionarios.gerenciar'),
  ('etiquetas.imprimir')
) AS p(permissao)
WHERE u.email = 'dona@giseleflavia.com.br'
ON CONFLICT (usuario_id, permissao) DO UPDATE
SET permitido = EXCLUDED.permitido;

INSERT INTO fornecedores (nome, categoria_fornecida, contato, whatsapp, email, cidade, estado, ultima_compra, status)
VALUES
  ('Rosa Bella Atacado', 'Vestidos e saias', 'Marina Costa', '(11) 98888-1200', 'marina@rosabella.com.br', 'Sao Paulo', 'SP', '2026-06-10', 'ativo'),
  ('Flor de Linho', 'Blusas e camisas', 'Helena Moura', '(85) 97777-4300', 'contato@flordelinho.com.br', 'Fortaleza', 'CE', '2026-06-08', 'ativo'),
  ('Verde Chic Confeccoes', 'Calcas e alfaiataria', 'Paula Reis', '(62) 95555-8100', 'paula@verdechic.com.br', 'Goiania', 'GO', '2026-06-12', 'ativo')
ON CONFLICT DO NOTHING;

INSERT INTO produtos (fornecedor_id, nome, categoria, descricao, preco, preco_promocional, status)
VALUES
  (1, 'Vestido Floral Midi', 'Vestidos', 'Vestido midi feminino com estampa floral e acabamento leve.', 129.90, 109.90, 'ativo'),
  (2, 'Blusa Canelada', 'Blusas', 'Blusa canelada versatil para looks casuais e elegantes.', 59.90, NULL, 'ativo'),
  (3, 'Calca Pantalona', 'Calcas', 'Calca pantalona de alfaiataria com caimento fluido.', 149.90, NULL, 'ativo')
ON CONFLICT DO NOTHING;

INSERT INTO produto_midias (produto_id, tipo, url, titulo, ordem, principal)
VALUES
  (1, 'imagem', 'assets/produtos/vestido-floral-midi-1.jpg', 'Imagem principal - Vestido Floral Midi', 1, TRUE),
  (1, 'imagem', 'assets/produtos/vestido-floral-midi-2.jpg', 'Detalhe do tecido - Vestido Floral Midi', 2, FALSE),
  (1, 'video', 'assets/produtos/vestido-floral-midi-video.mp4', 'Video demonstrativo - Vestido Floral Midi', 3, FALSE),
  (2, 'imagem', 'assets/produtos/blusa-canelada-1.jpg', 'Imagem principal - Blusa Canelada', 1, TRUE),
  (2, 'video', 'assets/produtos/blusa-canelada-video.mp4', 'Video demonstrativo - Blusa Canelada', 2, FALSE),
  (3, 'imagem', 'assets/produtos/calca-pantalona-1.jpg', 'Imagem principal - Calca Pantalona', 1, TRUE),
  (3, 'imagem', 'assets/produtos/calca-pantalona-2.jpg', 'Detalhe do caimento - Calca Pantalona', 2, FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO produto_variacoes (produto_id, tamanho, cor, sku)
VALUES
  (1, 'Único', 'Rosa', 'VEST-FLORAL-UNICO-ROSA'),
  (1, 'M', 'Rosa', 'VEST-FLORAL-M-ROSA'),
  (1, 'G', 'Verde', 'VEST-FLORAL-G-VERDE'),
  (2, 'Único', 'Branco', 'BLUSA-CANELADA-UNICO-BRANCO'),
  (2, 'M', 'Rosa', 'BLUSA-CANELADA-M-ROSA'),
  (2, 'G', 'Preto', 'BLUSA-CANELADA-G-PRETO'),
  (3, 'Único', 'Preto', 'CALCA-PANTALONA-UNICO-PRETO'),
  (3, 'M', 'Verde', 'CALCA-PANTALONA-M-VERDE'),
  (3, 'G', 'Caramelo', 'CALCA-PANTALONA-G-CARAMELO')
ON CONFLICT DO NOTHING;

INSERT INTO estoque (produto_variacao_id, quantidade, quantidade_minima)
SELECT id,
  CASE
    WHEN tamanho = 'Único' THEN 4
    WHEN tamanho = 'M' THEN 6
    ELSE 3
  END,
  2
FROM produto_variacoes
ON CONFLICT (produto_variacao_id) DO NOTHING;

INSERT INTO configuracoes_loja (chave, valor, descricao)
VALUES
  ('nome_loja', 'Gisele Flavia Modas', 'Nome comercial da loja'),
  ('cor_principal', '#F80080', 'Cor principal da identidade visual'),
  ('moeda', 'BRL', 'Moeda padrao do sistema')
ON CONFLICT (chave) DO NOTHING;
