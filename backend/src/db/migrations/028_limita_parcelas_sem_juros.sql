INSERT INTO configuracoes_loja (chave, valor, descricao)
VALUES ('parcelas_sem_juros', '3', 'Quantidade máxima de parcelas anunciadas')
ON CONFLICT (chave) DO UPDATE
SET valor = '3', descricao = EXCLUDED.descricao, updated_at = NOW();

UPDATE configuracoes_loja
SET valor = regexp_replace(valor, '12x sem juros', '3x sem juros', 'gi'),
    updated_at = NOW()
WHERE chave = 'faixa_superior'
  AND valor ~* '12x sem juros';
