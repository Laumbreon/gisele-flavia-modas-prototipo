BEGIN;

ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS peso_gramas INTEGER,
  ADD COLUMN IF NOT EXISTS comprimento_cm NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS largura_cm NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS altura_cm NUMERIC(8,2);

ALTER TABLE produtos
  DROP CONSTRAINT IF EXISTS produtos_peso_gramas_positivo,
  DROP CONSTRAINT IF EXISTS produtos_comprimento_cm_positivo,
  DROP CONSTRAINT IF EXISTS produtos_largura_cm_positivo,
  DROP CONSTRAINT IF EXISTS produtos_altura_cm_positivo;

ALTER TABLE produtos
  ADD CONSTRAINT produtos_peso_gramas_positivo CHECK (peso_gramas IS NULL OR peso_gramas > 0),
  ADD CONSTRAINT produtos_comprimento_cm_positivo CHECK (comprimento_cm IS NULL OR comprimento_cm > 0),
  ADD CONSTRAINT produtos_largura_cm_positivo CHECK (largura_cm IS NULL OR largura_cm > 0),
  ADD CONSTRAINT produtos_altura_cm_positivo CHECK (altura_cm IS NULL OR altura_cm > 0);

COMMIT;
