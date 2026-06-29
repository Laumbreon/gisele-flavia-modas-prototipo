-- Adiciona campos usados pelas rotas iniciais de clientes.

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
