-- ============================================================================
-- ATENÇÃO: USAR APENAS EM AMBIENTE DE TESTE/DEMO ANTES DE CADASTRAR PRODUTOS REAIS.
-- NÃO RODAR EM PRODUÇÃO COM VENDAS REAIS.
-- ============================================================================
-- Esta migration é DESTRUTIVA e remove todos os dados transacionais e produtos.
-- Ela preserva usuários, permissões, PINs, configurações, maquininhas e fretes.
-- Faça backup e confira o banco selecionado antes de executar manualmente.

BEGIN;

TRUNCATE TABLE
  vendas,
  movimentacoes_estoque,
  estoque,
  produto_midias,
  produto_fiscal,
  produto_variacoes,
  produtos
RESTART IDENTITY CASCADE;

-- Opcional para um ambiente demo totalmente novo (descomente conscientemente):
-- TRUNCATE TABLE fretes_bairro RESTART IDENTITY CASCADE;

COMMIT;
