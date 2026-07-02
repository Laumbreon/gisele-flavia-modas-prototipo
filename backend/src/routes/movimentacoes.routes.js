const express = require("express");
const movimentacoesController = require("../controllers/movimentacoes.controller");
const permissaoMiddleware = require("../middlewares/permissao.middleware");

const router = express.Router();

router.get("/", permissaoMiddleware("estoque.ver"), movimentacoesController.listarMovimentacoes);

module.exports = router;
