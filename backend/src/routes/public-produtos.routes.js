const express = require("express");
const produtosController = require("../controllers/produtos.controller");

const router = express.Router();

router.get("/", produtosController.listarProdutos);
router.get("/:id", produtosController.obterProduto);

module.exports = router;
