const express = require("express");
const estoqueController = require("../controllers/estoque.controller");
const permissoes = require("../middlewares/permissoes.middleware");

const router = express.Router();

router.get("/", permissoes(["estoque.ver", "produtos.editar"]), estoqueController.listarEstoque);
router.post("/:variacao_id/movimentar", permissoes(["estoque.editar", "produtos.editar"]), estoqueController.movimentarEstoque);

module.exports = router;
