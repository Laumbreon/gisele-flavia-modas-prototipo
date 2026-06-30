UPDATE produto_variacoes
SET tamanho = 'Único',
    updated_at = NOW()
WHERE tamanho IN ('Ãšnico', 'Unico', 'Įsnico');
