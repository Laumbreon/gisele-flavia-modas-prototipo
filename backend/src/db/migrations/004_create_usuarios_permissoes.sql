-- Estrutura inicial de usuarios e permissoes

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash TEXT,
  tipo VARCHAR(20) NOT NULL DEFAULT 'funcionario' CHECK (tipo IN ('dona', 'funcionario')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'funcionario' CHECK (tipo IN ('dona', 'funcionario')),
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'usuarios'
      AND column_name = 'perfil'
  ) THEN
    EXECUTE '
      UPDATE usuarios
      SET tipo = ''dona''
      WHERE tipo = ''funcionario''
        AND COALESCE(perfil, '''') IN (''admin'', ''dona'')
    ';
  END IF;
END $$;

ALTER TABLE usuarios
  DROP COLUMN IF EXISTS perfil;

CREATE TABLE IF NOT EXISTS permissoes_usuario (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  permissao VARCHAR(80) NOT NULL,
  permitido BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, permissao)
);
