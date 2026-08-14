const express = require("express");
const caixasController = require("../controllers/caixas.controller");
const permissoes = require("../middlewares/permissoes.middleware");
const adminPin = require("../middlewares/admin-pin.middleware");

const router = express.Router();

router.get("/aberto", permissoes(["caixa.ver", "vendas.criar", "relatorios.ver", "configuracoes.editar"]), caixasController.buscarCaixaAberto);
router.get("/resumo-pdv", permissoes(["caixa.ver", "vendas.criar", "relatorios.ver", "configuracoes.editar"]), caixasController.resumoPdv);
router.get("/relatorio", permissoes(["caixa.ver", "relatorios.ver", "configuracoes.editar"]), caixasController.relatorioCaixa);
router.post("/abrir", permissoes(["caixa.abrir", "configuracoes.editar"]), caixasController.abrirCaixa);
router.post("/:id/fechar", permissoes(["caixa.fechar", "configuracoes.editar"]), caixasController.fecharCaixa);
router.get("/", permissoes(["caixa.ver", "relatorios.ver", "configuracoes.editar"]), caixasController.listarCaixas);
router.get("/:id", permissoes(["caixa.ver", "relatorios.ver", "configuracoes.editar"]), caixasController.detalharCaixa);
router.put("/:id", permissoes(["configuracoes.editar"]), adminPin, caixasController.atualizarCaixa);
router.delete("/:id", permissoes(["configuracoes.editar"]), adminPin, caixasController.excluirCaixa);
router.post("/:id/movimentacoes", permissoes(["caixa.movimentar", "configuracoes.editar"]), caixasController.criarMovimentacao);

module.exports = router;
