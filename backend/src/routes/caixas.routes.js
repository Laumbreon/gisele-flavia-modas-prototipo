const express = require("express");
const caixasController = require("../controllers/caixas.controller");
const permissoes = require("../middlewares/permissoes.middleware");

const router = express.Router();

router.get("/aberto", permissoes(["caixa.ver", "vendas.criar", "relatorios.ver", "configuracoes.editar"]), caixasController.buscarCaixaAberto);
router.post("/abrir", permissoes(["caixa.abrir", "configuracoes.editar"]), caixasController.abrirCaixa);
router.post("/:id/fechar", permissoes(["caixa.fechar", "configuracoes.editar"]), caixasController.fecharCaixa);
router.get("/", permissoes(["caixa.ver", "relatorios.ver", "configuracoes.editar"]), caixasController.listarCaixas);
router.get("/:id", permissoes(["caixa.ver", "relatorios.ver", "configuracoes.editar"]), caixasController.detalharCaixa);
router.post("/:id/movimentacoes", permissoes(["caixa.movimentar", "configuracoes.editar"]), caixasController.criarMovimentacao);

module.exports = router;
