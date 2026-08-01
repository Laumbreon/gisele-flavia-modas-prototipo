ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS parcelas SMALLINT NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'vendas_parcelas_check'
       AND conrelid = 'vendas'::regclass
  ) THEN
    ALTER TABLE vendas
      ADD CONSTRAINT vendas_parcelas_check CHECK (parcelas BETWEEN 1 AND 12);
  END IF;
END
$$;
