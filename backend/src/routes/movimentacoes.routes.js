const express = require("express");
const movimentacoesController = require("../controllers/movimentacoes.controller");
const permissoes = require("../middlewares/permissoes.middleware");

const router = express.Router();

router.get("/", permissoes(["estoque.ver", "estoque.editar", "produtos.editar"]), movimentacoesController.listarMovimentacoes);

module.exports = router;
