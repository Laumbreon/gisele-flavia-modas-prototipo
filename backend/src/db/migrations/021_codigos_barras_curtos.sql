-- Mantém o SKU descritivo e padroniza somente o código usado nas etiquetas/leitores.
UPDATE produto_variacoes pv
SET codigo_barras = 'GF' || LPAD(pv.id::text, 6, '0'),
    updated_at = NOW()
WHERE (
    pv.codigo_barras IS NULL
    OR BTRIM(pv.codigo_barras) = ''
    OR LENGTH(pv.codigo_barras) > 18
  )
  AND NOT EXISTS (
    SELECT 1
    FROM produto_variacoes outra
    WHERE outra.id <> pv.id
      AND UPPER(outra.codigo_barras) = UPPER('GF' || LPAD(pv.id::text, 6, '0'))
  );

-- codigo_barras já possui restrição UNIQUE no schema/migration 007.
