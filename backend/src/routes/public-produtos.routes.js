const express = require("express");
const produtosController = require("../controllers/produtos.controller");

const router = express.Router();

router.get("/", produtosController.listarProdutosPublicos);
router.get("/categorias", produtosController.listarCategoriasPublicas);
router.get("/:id", produtosController.obterProdutoPublico);

module.exports = router;
