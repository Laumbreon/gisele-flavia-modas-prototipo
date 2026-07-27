BEGIN;

-- permissoes_usuario usa permissões textuais, portanto não exige tabela catálogo.
-- Garante que usuárias dona existentes mantenham acesso aos novos recursos.
INSERT INTO permissoes_usuario (usuario_id, permissao, permitido)
SELECT u.id, p.permissao, TRUE
FROM usuarios u
CROSS JOIN (VALUES
  ('pdv.acessar'),
  ('caixa.ver'),
  ('caixa.abrir'),
  ('caixa.movimentar'),
  ('caixa.fechar')
) p(permissao)
WHERE u.tipo IN ('dona', 'super_admin')
ON CONFLICT (usuario_id, permissao) DO UPDATE SET permitido = TRUE;

COMMIT;
