const express = require("express");
const caixasController = require("../controllers/caixas.controller");
const permissaoMiddleware = require("../middlewares/permissao.middleware");

const router = express.Router();

router.get("/aberto", permissaoMiddleware("relatorios.ver"), caixasController.buscarCaixaAberto);
router.post("/abrir", permissaoMiddleware("configuracoes.editar"), caixasController.abrirCaixa);
router.post("/:id/fechar", permissaoMiddleware("configuracoes.editar"), caixasController.fecharCaixa);
router.get("/", permissaoMiddleware("relatorios.ver"), caixasController.listarCaixas);
router.get("/:id", permissaoMiddleware("relatorios.ver"), caixasController.detalharCaixa);
router.post("/:id/movimentacoes", permissaoMiddleware("configuracoes.editar"), caixasController.criarMovimentacao);

module.exports = router;
